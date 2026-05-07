import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-envelope-circle-check" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '16px', display: 'block' }}></i>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>Check your email</h2>
            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '8px' }}>
              We sent a password reset link to <strong>{email}</strong>.
            </p>
            <p style={{ fontSize: '.85rem', color: '#94a3b8' }}>
              Didn't receive it? Check spam or{' '}
              <button
                onClick={() => setSent(false)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem', padding: 0 }}
              >
                try again
              </button>
              .
            </p>
            <Link href="/auth/login" style={{ display: 'inline-block', marginTop: '24px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-header-card">
              <Link href="/" className="auth-logo">
                <i className="fas fa-shopping-bag"></i> HILGOD
              </Link>
              <h2>Forgot Password?</h2>
              <p>Enter your email and we'll send a reset link</p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-icon-wrapper">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Send Reset Link'}
              </button>
            </form>

            <div className="auth-footer-links">
              <Link href="/auth/login">← Back to Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const AuthLayout = ({ children }) => (
  <>
    <style jsx global>{`
      body { background-color: #f8fafc; min-height: 100vh; }
      .auth-wrapper { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
      .auth-container { background: #ffffff; max-width: 420px; width: 100%; border-radius: 16px; padding: 40px 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.05),0 1px 3px rgba(0,0,0,0.05); }
      .auth-header-card { text-align: center; margin-bottom: 30px; }
      .auth-logo { display: inline-flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; color: var(--primary); text-decoration: none; margin-bottom: 20px; letter-spacing: 1px; }
      .auth-header-card h2 { font-size: 1.5rem; color: #1e293b; margin-bottom: 8px; font-weight: 700; }
      .auth-header-card p { color: #64748b; font-size: 0.95rem; }
      .auth-form .form-group { margin-bottom: 20px; }
      .auth-form label { display: block; font-size: 0.9rem; font-weight: 600; color: #334155; margin-bottom: 8px; }
      .input-icon-wrapper { position: relative; }
      .input-icon-wrapper i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1rem; pointer-events: none; }
      .input-icon-wrapper input { width: 100%; padding: 12px 14px 12px 42px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 1rem; color: #1e293b; transition: all 0.2s; background: #f8fafc; }
      .input-icon-wrapper input:focus { outline: none; border-color: var(--primary); background: #fff; box-shadow: 0 0 0 3px var(--primary-light); }
      .auth-submit-btn { width: 100%; padding: 14px; background: var(--primary); color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; display: flex; justify-content: center; align-items: center; }
      .auth-submit-btn:hover:not(:disabled) { background: var(--primary-dark); }
      .auth-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      .auth-alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
      .auth-alert-error { background: #fef2f2; color: #b91c1c; border-left: 4px solid #ef4444; }
      .auth-footer-links { text-align: center; margin-top: 24px; font-size: 0.95rem; color: #64748b; }
      .auth-footer-links a { color: var(--primary); font-weight: 600; text-decoration: none; }
    `}</style>
    {children}
  </>
);

ForgotPassword.getLayout = function getLayout(page) {
  return <AuthLayout>{page}</AuthLayout>;
};
