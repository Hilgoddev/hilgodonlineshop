import Link from 'next/link';
import Layout from '@/components/Layout';

// How the money flows for sellers: sale → commission → balance → payout.
// Numbers here must match backend/src/lib/payouts.js (5% up to $100 per item,
// 10% above; payouts arrive within 5 hours of being marked paid).
const SUPPORT_PHONE = '+357 95 130549';
const WHATSAPP = 'https://wa.me/35795130549';

const FLOW = [
  { icon: 'fa-cart-shopping', title: 'A buyer orders your product', body: 'They pay online (card, Paystack) or choose Pay on Delivery.' },
  { icon: 'fa-check-double', title: 'The sale is confirmed', body: 'Online payments count straight away. Pay on Delivery counts once the item is delivered and the cash is collected.' },
  { icon: 'fa-percent', title: 'Hilgod’s commission comes off', body: '5% for items up to $100, 10% for items above $100. Delivery fees go to delivery, not from your earnings.' },
  { icon: 'fa-wallet', title: 'The rest is your balance', body: 'You see it under My Earnings → Available to withdraw.' },
  { icon: 'fa-money-bill-transfer', title: 'You request a payout', body: 'Choose an amount and how to be paid: bank transfer (main), crypto, or another service.' },
  { icon: 'fa-user-check', title: 'An admin approves and sends it', body: 'Once it’s sent, the payout shows “Paid” in your history with the transfer reference, and you get an email.' },
];

export default function HowPayoutsWork() {
  return (
    <Layout title="How Payouts Work — Hilgod Seller" description="How selling on Hilgod pays you: commission, balance, payout methods and timing.">
      <div className="guide-page">
        <nav className="breadcrumb">
          <Link href="/seller/dashboard">Seller Dashboard</Link>
          <i className="fas fa-chevron-right sep"></i>
          <Link href="/seller/payouts">My Earnings</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">How payouts work</span>
        </nav>

        <header className="guide-hero">
          <span className="guide-hero__badge"><i className="fas fa-money-bill-trend-up"></i> Seller guide</span>
          <h1>How the money flows</h1>
          <p>From a buyer’s payment to money in your account — in six steps.</p>
        </header>

        <ol className="money-flow">
          {FLOW.map((s, i) => (
            <li key={s.title}>
              <div className="money-flow__icon"><i className={`fas ${s.icon}`}></i><span>{i + 1}</span></div>
              <div><h2>{s.title}</h2><p>{s.body}</p></div>
            </li>
          ))}
        </ol>

        <section className="money-section">
          <h2><i className="fas fa-percent"></i> Commission</h2>
          <div className="commission-table">
            <div><span>Item price up to <strong>$100</strong></span><strong className="commission-table__rate">5%</strong><span>e.g. ₦50,000 item → you keep ₦47,500</span></div>
            <div><span>Item price above <strong>$100</strong></span><strong className="commission-table__rate">10%</strong><span>e.g. ₦250,000 item → you keep ₦225,000</span></div>
          </div>
          <p className="money-note">Each item is checked on its own, using that day’s exchange rate when the order is placed ($100 is about ₦140,000–₦145,000 at current rates). The rate is then fixed for that sale, so your earnings never change later. Cancelled and returned items don’t count.</p>
        </section>

        <section className="money-section">
          <h2><i className="fas fa-building-columns"></i> Ways to get paid</h2>
          <div className="method-cards">
            <div className="method-card method-card--main"><i className="fas fa-building-columns"></i><h3>Bank transfer <span>Main</span></h3><p>Bank name, account name and 10-digit account number. Make sure the name matches your account.</p></div>
            <div className="method-card"><i className="fas fa-coins"></i><h3>Crypto</h3><p>USDT, USDC, BTC or ETH. Choose the coin <em>and</em> network (e.g. USDT on TRC20) and paste your wallet address. Crypto sent to a wrong address can’t be recovered — double-check it.</p></div>
            <div className="method-card"><i className="fas fa-mobile-screen"></i><h3>Other</h3><p>OPay, PalmPay, PayPal, Payoneer and similar. Tell us the service and the account, phone number or email.</p></div>
          </div>
          <p className="money-note">We remember your details for next time, so the next request is quicker.</p>
        </section>

        <section className="money-section">
          <h2><i className="fas fa-list-check"></i> Requesting a payout</h2>
          <ol className="money-steps">
            <li>Go to <Link href="/seller/payouts">My Earnings</Link> and click <strong>Request payout</strong>.</li>
            <li>Enter the amount (or <strong>Withdraw all</strong>) — up to your available balance.</li>
            <li>Pick how to be paid and check your details.</li>
            <li>Submit. You can have one request waiting for review at a time.</li>
          </ol>
          <div className="payout-timeline">
            {[['Pending review', 'We check your request'], ['Approved', 'The money is being sent'], ['Paid', 'Sent — with a transfer reference']].map(([t, d], i) => (
              <div key={t}><b>{i + 1}</b><strong>{t}</strong><span>{d}</span></div>
            ))}
          </div>
          <p className="money-note">You get an email at each step. If a request is declined, the reason is shown and the amount goes back into your balance.</p>
        </section>

        <section className="money-alert">
          <i className="fas fa-clock"></i>
          <div>
            <h2>Didn’t get your money?</h2>
            <p>Payouts should reach you within <strong>5 hours</strong> of being marked <strong>Paid</strong>. If they haven’t, contact us on <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}>{SUPPORT_PHONE}</a> (call or WhatsApp) and report a discrepancy. Quote the <strong>transfer reference</strong> from your payout history.</p>
            <a className="btn btn-primary btn-sm" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp"></i> WhatsApp support</a>
          </div>
        </section>

        <section className="guide-faq">
          <h2>Questions</h2>
          <details><summary>Why can’t I withdraw a sale yet?</summary><p>Only confirmed sales count: paid online orders, or Pay on Delivery orders once delivered. Pending, cancelled and returned items aren’t added to your balance.</p></details>
          <details><summary>Is there a minimum payout?</summary><p>No minimum — you can withdraw any amount up to your available balance.</p></details>
          <details><summary>Can I change my bank or wallet?</summary><p>Yes. Enter the new details on your next request; we’ll remember them from then on.</p></details>
          <details><summary>Do I pay the delivery fee?</summary><p>No. Delivery fees are paid by the buyer and aren’t taken from your earnings.</p></details>
        </section>

        <div className="guide-cta">
          <h2>Ready to withdraw?</h2>
          <Link href="/seller/payouts" className="btn btn-primary btn-lg"><i className="fas fa-wallet"></i> Go to My Earnings</Link>
          <Link href="/seller/guide" className="btn btn-outline btn-lg">Product upload guide</Link>
        </div>
      </div>
    </Layout>
  );
}
