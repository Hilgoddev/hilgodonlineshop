// Delivery details collected at checkout. Every order is handed to GIG
// Logistics with these, so they are checked and trimmed here rather than
// stored as whatever the browser sent.

// Pay on Delivery is collected by GIG on the doorstep, so it is only offered
// where GIG delivers with cash collection. Comma-separated, e.g. "Nigeria,Ghana".
const COD_COUNTRIES = (process.env.COD_COUNTRIES || 'Nigeria')
    .split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);

const FIELDS = {
    firstName:    { label: 'First name', max: 60, required: true },
    lastName:     { label: 'Last name', max: 60, required: true },
    email:        { label: 'Email', max: 120, required: true },
    phone:        { label: 'Phone number', max: 20, required: true },
    altPhone:     { label: 'Alternative phone', max: 20 },
    country:      { label: 'Country', max: 60, required: true },
    state:        { label: 'State / region', max: 60, required: true },
    city:         { label: 'City / town', max: 60, required: true },
    street:       { label: 'Delivery address', max: 200, required: true },
    landmark:     { label: 'Nearest landmark', max: 120 },
    postalCode:   { label: 'Postal code', max: 20 },
    instructions: { label: 'Delivery instructions', max: 300 },
};

const PHONE_RE = /^\+?[0-9][0-9 ()-]{6,18}[0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isCodCountry = (country) => COD_COUNTRIES.includes(String(country || '').trim().toLowerCase());

// Returns { address, error }. Pay on Delivery additionally needs a country GIG
// collects cash in and a landmark so the rider can find the door.
function cleanShippingAddress(raw, paymentMethod) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { address: null, error: 'Delivery details are required.' };
    }
    const address = {};
    for (const [key, rule] of Object.entries(FIELDS)) {
        const value = typeof raw[key] === 'string' ? raw[key].replace(/\s+/g, ' ').trim() : '';
        if (!value) {
            if (rule.required) return { address: null, error: `${rule.label} is required.` };
            continue;
        }
        if (value.length > rule.max) return { address: null, error: `${rule.label} must be ${rule.max} characters or less.` };
        address[key] = value;
    }
    if (!EMAIL_RE.test(address.email)) return { address: null, error: 'Enter a valid email address.' };
    if (!PHONE_RE.test(address.phone)) return { address: null, error: 'Enter a valid phone number, e.g. +234 803 123 4567.' };
    if (address.altPhone && !PHONE_RE.test(address.altPhone)) return { address: null, error: 'Enter a valid alternative phone number.' };
    if (address.street.length < 5) return { address: null, error: 'Enter the full delivery address (house number and street).' };

    if (paymentMethod === 'pod') {
        if (!isCodCountry(address.country)) {
            return { address: null, error: `Pay on Delivery is only available in ${COD_COUNTRIES.map((c) => c.replace(/\b\w/g, (m) => m.toUpperCase())).join(', ')}. Please choose another payment method.` };
        }
        if (!address.landmark) return { address: null, error: 'Pay on Delivery needs a nearest landmark so the GIG rider can find you.' };
    }
    return { address, error: null };
}

module.exports = { cleanShippingAddress, isCodCountry, COD_COUNTRIES };
