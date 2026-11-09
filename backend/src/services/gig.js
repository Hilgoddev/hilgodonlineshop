// Hand-off to GIG Logistics. Once an order is ready to ship (a Pay on Delivery
// order when it is placed, a prepaid one when payment is confirmed), its
// delivery details are sent to GIG, and the waybill GIG returns is stored on
// every line of the order (order_items.shipping_tracking, migration 023) so the
// buyer, seller and admin all see the same tracking.
//
// Booking runs automatically only when GIG API credentials are configured:
//   GIG_API_BASE      e.g. https://thirdparty.gigl-go.com/api/thirdparty
//   GIG_USERNAME / GIG_PASSWORD
//   GIG_LOGIN_PATH    default /login
//   GIG_SHIPMENT_PATH default /captureshipment
//   GIG_TRACKING_URL  default https://giglogistics.com/track/mobileShipment?waybill={waybill}
//   GIG_SENDER_*      pickup details (name, phone, address, city, state)
// Without them the order is marked "awaiting GIG booking" and an admin books it
// with GIG and enters the waybill (admin route PUT /api/admin/orders/:id/gig).

const supabase = require('../config/supabase');
const { cleanEnv } = require('../lib/env');

const env = (k, d = '') => cleanEnv(process.env[k]) || d;
const CARRIER = 'GIG Logistics';

const isConfigured = () => !!(env('GIG_API_BASE') && env('GIG_USERNAME') && env('GIG_PASSWORD'));

function trackingUrl(waybill) {
    const tpl = env('GIG_TRACKING_URL', 'https://giglogistics.com/track/mobileShipment?waybill={waybill}');
    return tpl.replace('{waybill}', encodeURIComponent(waybill));
}

// The tracking record stored on each order line.
function trackingRecord({ status, waybill = null, error = null, source = 'gig' }) {
    const rec = { carrier: CARRIER, status, source, updatedAt: new Date().toISOString() };
    if (waybill) { rec.trackingNumber = waybill; rec.trackingUrl = trackingUrl(waybill); }
    if (error) rec.error = String(error).slice(0, 300);
    return rec;
}

// Shipment request for GIG: receiver, items and (for Pay on Delivery) the
// amount the rider collects.
function buildShipment(order, items) {
    const a = order.shipping_address || {};
    const cod = order.payment_method === 'pod';
    return {
        reference: order.id,
        sender: {
            name: env('GIG_SENDER_NAME', 'Hilgod Online Store'),
            phone: env('GIG_SENDER_PHONE'),
            address: env('GIG_SENDER_ADDRESS'),
            city: env('GIG_SENDER_CITY'),
            state: env('GIG_SENDER_STATE'),
        },
        receiver: {
            name: `${a.firstName || ''} ${a.lastName || ''}`.trim(),
            phone: a.phone || '',
            altPhone: a.altPhone || '',
            email: a.email || '',
            address: [a.street, a.landmark && `Near ${a.landmark}`].filter(Boolean).join(', '),
            city: a.city || '',
            state: a.state || '',
            country: a.country || '',
            postalCode: a.postalCode || '',
            instructions: a.instructions || '',
        },
        items: (items || []).map((it) => ({
            description: it.product?.name || 'Item',
            quantity: it.quantity,
            value: Number(it.unit_price || 0),
            options: it.selected_options || null,
        })),
        paymentMethod: cod ? 'cash_on_delivery' : 'prepaid',
        cashOnDeliveryAmount: cod ? Number(order.total_amount || 0) : 0,
        currency: order.currency || 'NGN',
    };
}

async function gigRequest(path, body, token) {
    const res = await fetch(env('GIG_API_BASE').replace(/\/$/, '') + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || json.Message || `GIG returned ${res.status}`);
    return json;
}

// Book with the GIG API; resolves to the waybill number.
async function bookWithGig(shipment) {
    const login = await gigRequest(env('GIG_LOGIN_PATH', '/login'), { username: env('GIG_USERNAME'), Password: env('GIG_PASSWORD') });
    const token = login.Object?.access_token || login.access_token || login.token;
    if (!token) throw new Error('GIG login did not return a token');
    const booked = await gigRequest(env('GIG_SHIPMENT_PATH', '/captureshipment'), shipment, token);
    const waybill = booked.Object?.waybill || booked.Object?.Waybill || booked.waybill || booked.Waybill;
    if (!waybill) throw new Error('GIG did not return a waybill number');
    return String(waybill);
}

async function writeTracking(orderId, record) {
    const { error } = await supabase.from('order_items').update({ shipping_tracking: record }).eq('order_id', orderId);
    if (error) throw error;
}

// Send an order to GIG. Never throws (it runs after checkout/payment and must
// not break them); returns the tracking record that was stored, or null.
// Orders that already have a GIG waybill are left alone unless `force`.
async function dispatchOrderToGig(orderId, { force = false } = {}) {
    try {
        const [{ data: order, error: orderErr }, { data: items, error: itemsErr }] = await Promise.all([
            supabase.from('orders').select('id, status, total_amount, currency, payment_method, shipping_address').eq('id', orderId).maybeSingle(),
            supabase.from('order_items').select('id, quantity, unit_price, selected_options, shipping_tracking, fulfillment_status, product:products(name)').eq('order_id', orderId),
        ]);
        if (orderErr) throw orderErr;
        if (itemsErr) throw itemsErr;
        if (!order || order.status === 'cancelled' || !items?.length) return null;
        if (!force && items.some((it) => it.shipping_tracking?.trackingNumber)) return items[0].shipping_tracking;

        const live = items.filter((it) => it.fulfillment_status !== 'cancelled');
        if (!isConfigured()) {
            const rec = trackingRecord({ status: 'awaiting_booking' });
            await writeTracking(orderId, rec);
            return rec;
        }
        let rec;
        try {
            rec = trackingRecord({ status: 'booked', waybill: await bookWithGig(buildShipment(order, live)) });
        } catch (e) {
            console.error('[GIG] booking failed for order', orderId, e.message);
            rec = trackingRecord({ status: 'booking_failed', error: e.message });
        }
        await writeTracking(orderId, rec);
        return rec;
    } catch (e) {
        console.error('[GIG] dispatch error for order', orderId, e?.message || e);
        return null;
    }
}

// Admin enters a waybill after booking with GIG by hand.
async function setManualWaybill(orderId, waybill) {
    const clean = String(waybill || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,39}$/.test(clean)) throw Object.assign(new Error('Enter the GIG waybill number (letters, numbers and dashes).'), { status: 400 });
    const rec = trackingRecord({ status: 'booked', waybill: clean, source: 'manual' });
    await writeTracking(orderId, rec);
    return rec;
}

module.exports = { dispatchOrderToGig, setManualWaybill, buildShipment, trackingUrl, isConfigured };
