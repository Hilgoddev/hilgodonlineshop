import Link from 'next/link';
import Layout from '@/components/Layout';
import SellerGuard from '@/components/SellerGuard';

// Placeholder for the seller money-flow explainer (how sales become payouts).
// Linked from My Earnings; the full guide is still being written.
export default function HowPayoutsWork() {
  return (
    <Layout title="How Payouts Work — Hilgod Seller">
      <div className="guide-page" style={{ maxWidth: 720 }}>
        <nav className="breadcrumb">
          <Link href="/seller/dashboard">Seller Dashboard</Link>
          <i className="fas fa-chevron-right sep"></i>
          <Link href="/seller/payouts">My Earnings</Link>
          <i className="fas fa-chevron-right sep"></i>
          <span className="current">How it works</span>
        </nav>
        <div className="coming-soon-card">
          <div className="coming-soon-card__icon"><i className="fas fa-money-bill-trend-up"></i></div>
          <span className="coming-soon-card__badge">Coming soon</span>
          <h1>How the money flows</h1>
          <p>
            We’re putting together a simple guide to how your sales turn into payouts — from a buyer’s payment,
            to delivery, to the money reaching your bank account.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/seller/payouts" className="btn btn-primary"><i className="fas fa-wallet"></i> Back to My Earnings</Link>
            <Link href="/seller/guide" className="btn btn-outline"><i className="fas fa-book-open"></i> Product upload guide</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

HowPayoutsWork.getLayout = function getLayout(page) {
  return <SellerGuard>{page}</SellerGuard>;
};
