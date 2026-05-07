import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { apiFetch, syncProfile } from '../../lib/apiClient';
import { useSession } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const getFreshAccessToken = async (initialToken) => {
    if (initialToken) return initialToken;
    for (let i = 0; i < 6; i++) {
      const { data: current } = await supabase.auth.getSession();
      const token = current?.session?.access_token;
      if (token) return token;
      await new Promise((r) => setTimeout(r, 150));
    }
    return null;
  };

  const redirectByRole = async (userId, accessToken) => {
    const stableToken = await getFreshAccessToken(accessToken);
    let role = null;
    try {
      const meRes = await apiFetch('/api/auth/me', { accessToken: stableToken });
      const meData = await meRes.json();
      role = meData?.data?.role || null;
    } catch (_) {}

    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      const fallbackRole = session?.user?.role || session?.user?.user_metadata?.role;
      role = profile?.role || fallbackRole || 'customer';
    }

    if (role === 'admin') {
      router.replace('/admin');
    } else if (role === 'seller') {
      router.replace('/seller/dashboard');
    } else {
      router.replace('/account');
    }
  };

  // If user is already authenticated, don't keep them on login page.
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    redirectByRole(session.user.id, session?.access_token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Invalid email or password');
      } else {
        const stableToken = await getFreshAccessToken(data?.session?.access_token);
        if (!stableToken) {
          setError('Signed in, but session token is not ready yet. Please try again.');
          return;
        }
        try { await syncProfile(); } catch (_) {}
        await redirectByRole(data.user.id, stableToken);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/login`
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-header-card">
          <Link href="/" className="auth-logo">
            <i className="fas fa-shopping-bag"></i> HILGOD
          </Link>
          <h2>Welcome Back</h2>
          <p>Sign in to access your account</p>
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

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              <Link href="/auth/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <div className="input-icon-wrapper" style={{ position: 'relative' }}>
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button"
                className="toggle-password"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling;
                  if (input.type === 'password') {
                    input.type = 'text';
                    e.currentTarget.innerHTML = '<i class="fas fa-eye-slash"></i>';
                  } else {
                    input.type = 'password';
                    e.currentTarget.innerHTML = '<i class="fas fa-eye"></i>';
                  }
                }}
              >
                <i className="fas fa-eye"></i>
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Sign In'}
          </button>
        </form>

        <div className="auth-separator">
          <span>or</span>
        </div>

        <button type="button" className="google-auth-btn" onClick={handleGoogleLogin} disabled={loading}>
          <img src="/google-logo.svg" alt="Google" width="20" height="20" />
          Continue with Google
        </button>

        <div className="auth-footer-links">
          Don't have an account? <Link href="/auth/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

// Layout for Auth Pages
const AuthLayout = ({ children }) => {
  return (
    <>
      <style jsx global>{`
        body {
          background-color: #f8fafc;
          min-height: 100vh;
        }
        .auth-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .auth-container {
          background: #ffffff;
          max-width: 420px;
          width: 100%;
          border-radius: 16px;
          padding: 40px 30px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0,0,0,0.05);
        }
        .auth-header-card {
          text-align: center;
          margin-bottom: 30px;
        }
        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary);
          text-decoration: none;
          margin-bottom: 20px;
          letter-spacing: 1px;
        }
        .auth-header-card h2 {
          font-size: 1.5rem;
          color: #1e293b;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .auth-header-card p {
          color: #64748b;
          font-size: 0.95rem;
        }
        .auth-form .form-group {
          margin-bottom: 20px;
        }
        .auth-form label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 8px;
        }
        .input-icon-wrapper {
          position: relative;
        }
        .input-icon-wrapper i:not(.toggle-password i) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 1rem;
          pointer-events: none;
        }
        .input-icon-wrapper input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          color: #1e293b;
          transition: all 0.2s;
          background: #f8fafc;
        }
        .input-icon-wrapper input:focus {
          outline: none;
          border-color: var(--primary);
          background: #ffffff;
          box-shadow: 0 0 0 3px var(--primary-light);
        }
        .toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px;
        }
        .toggle-password:hover {
          color: #475569;
        }
        .auth-submit-btn {
          width: 100%;
          padding: 14px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .auth-submit-btn:hover:not(:disabled) {
          background: var(--primary-dark);
        }
        .auth-submit-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .auth-separator {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          color: #94a3b8;
          font-size: 0.9rem;
        }
        .auth-separator::before,
        .auth-separator::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e2e8f0;
        }
        .auth-separator span {
          padding: 0 10px;
        }
        .google-auth-btn {
          width: 100%;
          padding: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #334155;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          transition: background 0.2s;
        }
        .google-auth-btn:hover {
          background: #f8fafc;
        }
        .auth-footer-links {
          text-align: center;
          margin-top: 24px;
          font-size: 0.95rem;
          color: #64748b;
        }
        .auth-footer-links a {
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
        }
        .auth-footer-links a:hover {
          text-decoration: underline;
        }
        .auth-alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .auth-alert-error {
          background: #fef2f2;
          color: #b91c1c;
          border-left: 4px solid #ef4444;
        }
        @media (max-width: 480px) {
          .auth-container {
            padding: 30px 20px;
          }
        }
      `}</style>
      {children}
    </>
  );
};

Login.getLayout = function getLayout(page) {
  return <AuthLayout>{page}</AuthLayout>;
};
