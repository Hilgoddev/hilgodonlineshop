import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiFetch } from '../../lib/apiClient';
import { useSession } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const STRENGTH_COLORS = ['#94a3b8', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

const strengthScore = (pass) =>
  (pass.length >= 8 ? 1 : 0) +
  (/[A-Z]/.test(pass) ? 1 : 0) +
  (/[0-9]/.test(pass) ? 1 : 0) +
  (/[^A-Za-z0-9]/.test(pass) ? 1 : 0);

export default function AdminSettings() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileFailed, setProfileFailed] = useState(false);

  // Auth provider straight from the Supabase session (no API dependency).
  const [authProvider, setAuthProvider] = useState(null);

  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', image: '' });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });
  const [passSaving, setPassSaving] = useState(false);
  const [passStrength, setPassStrength] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      const providers = s?.user?.app_metadata?.providers || [];
      setAuthProvider(providers[0] || (s?.user ? 'email' : null));
    });
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/user/profile');
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setProfileData({
          firstName: json.data.firstName || '',
          lastName: json.data.lastName || '',
          image: json.data.image || '',
        });
        setAuthProvider(json.data.provider || authProvider);
        setProfileFailed(false);
      } else {
        setProfileFailed(true);
      }
    } catch {
      setProfileFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session?.user?.id) loadProfile(); }, [session?.user?.id]);

  const msgBox = (msg) => !msg.text ? null : (
    <div style={{
      padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '.88rem', fontWeight: 600,
      background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
      color: msg.type === 'success' ? '#15803d' : '#b91c1c',
      border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
    }}>
      <i className={`fas ${msg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
      {msg.text}
    </div>
  );


  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await apiFetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(profileData) });
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setEditing(false), 1500);
      } else {
        setProfileMsg({ type: 'error', text: json.error || 'Failed to update profile' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Network error occurred' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setPassSaving(true);
    setPassMsg({ type: '', text: '' });
    try {
      const res = await apiFetch('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: passData.currentPassword, newPassword: passData.newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        setPassMsg({ type: 'success', text: 'Password updated successfully!' });
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPassStrength(0);
      } else {
        setPassMsg({ type: 'error', text: json.error || 'Failed to update password' });
      }
    } catch {
      setPassMsg({ type: 'error', text: 'Network error occurred' });
    } finally {
      setPassSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
      </div>
    );
  }



  // Effective profile data — falls back to the Supabase session when the
  // backend profile fetch failed, so the page is never a dead end.
  const displayName = [profile?.firstName || session?.user?.firstName || '', profile?.lastName || session?.user?.lastName || '']
    .join(' ').trim() || session?.user?.email || 'Admin';
  const displayEmail = profile?.email || session?.user?.email || '—';
  const displayImage = profile?.image || '';
  const displayRole = profile?.role || session?.user?.role || 'admin';
  const provider = authProvider || profile?.provider || 'email';
  const initials = displayName.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'A';

  const card = { background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' };
  const label = { display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#334155', marginBottom: '6px' };
  const input = {
    width: '100%', padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
    fontSize: '.95rem', background: '#fff', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* PROFILE */}
      <div style={card}>
        <h2 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '0 0 20px', color: '#0f172a' }}>Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {displayImage ? (
            <img src={displayImage} alt="Avatar" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e0f2fe' }} />
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{displayName}</div>
            <div style={{ fontSize: '.88rem', color: '#64748b', marginTop: '2px' }}>{displayEmail}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '.72rem', padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase' }}>
                {String(displayRole)}
              </span>
              <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '.72rem', padding: '3px 10px', borderRadius: '999px' }}>
                <i className={`fa${provider === 'google' ? 'b' : 's'} ${provider === 'google' ? 'fa-google' : 'fa-envelope'}`} style={{ marginRight: '6px' }}></i>
                {provider === 'google' ? 'Google Account' : 'Email Account'}
              </span>
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', padding: '9px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
              <i className="fas fa-pen" style={{ marginRight: '8px' }}></i>Edit
            </button>
          )}
        </div>

        {profileFailed && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', fontSize: '.88rem', fontWeight: 600, marginTop: '16px' }}>
            <i className="fas fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
            Couldn't load the full profile — some fields are shown from your session instead.
          </div>
        )}

        {editing && (
          <form onSubmit={handleProfileUpdate} style={{ marginTop: '20px', maxWidth: '420px' }}>
            {msgBox(profileMsg)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={label}>First Name</label>
                <input style={input} value={profileData.firstName} onChange={e => setProfileData({ ...profileData, firstName: e.target.value })} />
              </div>
              <div>
                <label style={label}>Last Name</label>
                <input style={input} value={profileData.lastName} onChange={e => setProfileData({ ...profileData, lastName: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={label}>Avatar URL</label>
              <input style={input} type="url" placeholder="https://…" value={profileData.image} onChange={e => setProfileData({ ...profileData, image: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" disabled={profileSaving} className="btn btn-primary" style={{ padding: '10px 18px', fontWeight: 700, fontSize: '.88rem' }}>
                {profileSaving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Saving…</> : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { setEditing(false); setProfileMsg({ type: '', text: '' }); }} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>


      {/* PASSWORD */}
      {provider === 'email' && (
        <div style={card}>
          <h2 style={{ fontWeight: 800, fontSize: '1.15rem', margin: '0 0 20px', color: '#0f172a' }}>Change Password</h2>
          <form onSubmit={handlePasswordUpdate} style={{ maxWidth: '420px' }}>
            {msgBox(passMsg)}
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Current Password</label>
              <input style={input} type="password" required value={passData.currentPassword} onChange={e => setPassData({ ...passData, currentPassword: e.target.value })} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>New Password</label>
              <input style={input} type="password" required value={passData.newPassword} onChange={e => { setPassData({ ...passData, newPassword: e.target.value }); setPassStrength(strengthScore(e.target.value)); }} />
              {passData.newPassword && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ width: `${passStrength * 25}%`, height: '100%', background: STRENGTH_COLORS[passStrength], transition: 'all .3s' }}></div>
                  </div>
                  <div style={{ fontSize: '.72rem', color: STRENGTH_COLORS[passStrength], fontWeight: 700, marginTop: '4px' }}>{STRENGTH_LABELS[passStrength]}</div>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Confirm New Password</label>
              <input style={input} type="password" required value={passData.confirmPassword} onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })} />
            </div>
            <button type="submit" disabled={passSaving} className="btn btn-primary" style={{ padding: '11px 18px', fontWeight: 700, fontSize: '.9rem' }}>
              {passSaving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Updating…</> : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {provider === 'google' && (
        <div style={card}>
          <p style={{ color: '#64748b', fontSize: '.9rem', margin: 0 }}>
            <i className="fab fa-google" style={{ marginRight: '8px', color: '#0ea5e9' }}></i>
            You sign in with Google, so there's no Hilgod password to change here. Use the "Continue with Google" button on the sign-in page to access your account.
          </p>
        </div>
      )}
    </div>
  );
}

AdminSettings.getLayout = function getLayout(page) {
  return (
    <AdminGuard>
      <AdminLayout title="Settings">{page}</AdminLayout>
    </AdminGuard>
  );
};
