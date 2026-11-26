import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../lib/apiClient';

const DISMISS_KEY = 'hilgod_seller_prompt_dismissed';

// Subtle invite on a customer's account page: "Have something to sell?".
// Hidden once they've applied (the card then shows the application's status
// instead) and when they dismiss it.
export default function BecomeSellerPrompt() {
  const [state, setState] = useState({ loading: true, application: null, dismissed: false });

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* ignore */ }
    let alive = true;
    apiFetch('/api/seller/application-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setState({ loading: false, application: j?.success ? j.data : null, dismissed }); })
      .catch(() => { if (alive) setState({ loading: false, application: null, dismissed }); });
    return () => { alive = false; };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setState((s) => ({ ...s, dismissed: true }));
  };

  if (state.loading) return null;
  const app = state.application;

  if (app && app.status !== 'rejected') {
    return (
      <div className="seller-prompt seller-prompt--status">
        <i className={`fas ${app.status === 'approved' ? 'fa-circle-check' : 'fa-hourglass-half'}`}></i>
        <div>
          <strong>{app.status === 'approved' ? 'Your seller profile is approved' : 'Your seller application is being reviewed'}</strong>
          <span>{app.status === 'approved' ? 'Sign out and back in to open your Seller Dashboard.' : 'We’ll email you once an admin has reviewed it.'}</span>
        </div>
      </div>
    );
  }
  if (state.dismissed) return null;

  return (
    <div className="seller-prompt">
      <div className="seller-prompt__icon"><i className="fas fa-store"></i></div>
      <div className="seller-prompt__text">
        <strong>Have products or items you want to sell?</strong>
        <span>Create a seller profile and reach buyers across Nigeria. It’s free to apply.</span>
      </div>
      <Link href="/seller-zone" className="btn btn-primary btn-sm seller-prompt__cta">
        {app?.status === 'rejected' ? 'Apply again' : 'Become a seller'} <i className="fas fa-arrow-right"></i>
      </Link>
      <button type="button" className="seller-prompt__close" onClick={dismiss} aria-label="Hide this">
        <i className="fas fa-xmark"></i>
      </button>
    </div>
  );
}
