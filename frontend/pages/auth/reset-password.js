import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.replace('/auth/login'), 3000);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-circle-check" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '16px', display: 'block' }}></i>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>Password Updated!</h2>
            <p style={{ color: '#64748b' }}>Your password has been changed. Redirecting you to sign in...</p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '16px', display: 'block' }}></i>
            <p style={{ color: '#64748b', marginBottom: '12px' }}>Verifying your reset link...</p>
            <p style={{ fontSize: '.85rem', color: '#94a3b8' }}>
              Link expired?{' '}
              <Link href="/auth/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Request a new one
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="auth-header-card">
              <Link href="/" className="auth-logo">
                <img src="/logo.png" alt="Hilgod" />
              </Link>
              <h2>Set New Password</h2>
              <p>Choose a strong password for your account</p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <div className="input-icon-wrapper">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirm">Confirm Password</label>
                <div className="input-icon-wrapper">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    id="confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Update Password'}
              </button>
            </form>
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
      .auth-logo { display: flex; justify-content: center; text-decoration: none; margin-bottom: 20px; }
      .auth-logo img { height: 80px; width: auto; object-fit: contain; }
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
    `}</style>
    {children}
  </>
);

ResetPassword.getLayout = function getLayout(page) {
  return <AuthLayout>{page}</AuthLayout>;
};
