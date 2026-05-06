import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { syncProfile } from '../../lib/apiClient';

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (router.query.emailVerification === 'pending') {
      setShowModal(true);
    }
  }, [router.query]);

  const calculatePasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message || 'Registration failed. Please try again.');
      } else if (data.session) {
        // Supabase email confirmation is off — already signed in
        try { await syncProfile({ full_name: `${formData.firstName} ${formData.lastName}`.trim() }); } catch (_) {}
        router.push('/account');
      } else {
        // Email confirmation required — try backend auto-confirm (works when EMAIL_VERIFICATION_ENABLED=false)
        try {
          const confirmRes = await fetch('/api/auth/auto-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email }),
          });

          if (confirmRes.ok) {
            // Confirmed — sign in immediately
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            });
            if (signInError) throw signInError;
            try { await syncProfile({ full_name: `${formData.firstName} ${formData.lastName}`.trim() }); } catch (_) {}
            router.push('/account');
          } else {
            // Email verification is enabled — show modal
            setShowModal(true);
          }
        } catch (_) {
          setShowModal(true);
        }
      }
    } catch (err) {
      console.error('Registration frontend error:', err);
      setError(err.message || 'An error occurred during registration. Please try again.');
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

  const strengthColors = ['#e2e8f0', '#ef4444', '#f59e0b', '#22c55e', '#0ea5e9'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return (
    <div className="auth-wrapper">
      <div className="auth-container" style={{ maxWidth: '500px' }}>
        <div className="auth-header-card">
          <Link href="/" className="auth-logo">
            <i className="fas fa-shopping-bag"></i> HILGOD
          </Link>
          <h2>Create Account</h2>
          <p>Join millions of happy Hilgod shoppers</p>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="firstName">First Name</label>
              <div className="input-icon-wrapper">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="First name"
                  required
                />
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="lastName">Last Name</label>
              <div className="input-icon-wrapper">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-icon-wrapper">
              <i className="fas fa-envelope"></i>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrapper">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
                required
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
            {formData.password.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.max(passwordStrength * 25, 10)}%`, 
                    background: strengthColors[passwordStrength],
                    transition: 'all 0.3s'
                  }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: strengthColors[passwordStrength], fontWeight: '500' }}>
                  {strengthLabels[passwordStrength] || 'Very Weak'}
                </div>
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', lineHeight: '1.4' }}>
              Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <div className="input-icon-wrapper">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                id="confirm"
                name="confirm"
                value={formData.confirm}
                onChange={handleInputChange}
                placeholder="Repeat your password"
                required
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

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="terms" 
              required 
              style={{ marginTop: '4px', accentColor: 'var(--primary)', width: '16px', height: '16px' }}
            />
            <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal', margin: 0 }}>
              I agree to the <Link href="/terms" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Terms of Service</Link> and{' '}
              <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Privacy Policy</Link>
            </label>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Create Account'}
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
          Already have an account? <Link href="/auth/login">Sign In</Link>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 30px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📧</div>
            <h3 style={{ color: '#1e293b', marginBottom: '12px', fontSize: '1.3rem' }}>Check Your Email</h3>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
              We sent a verification link to <strong>{formData.email}</strong>. Click the link to activate your account, then sign in.
            </p>
            <Link href="/auth/login" style={{ display: 'block', padding: '12px', background: 'var(--primary)', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', marginBottom: '12px' }}>
              Go to Login
            </Link>
            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
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
          padding: 20px 10px;
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

Signup.getLayout = function getLayout(page) {
  return <AuthLayout>{page}</AuthLayout>;
};
