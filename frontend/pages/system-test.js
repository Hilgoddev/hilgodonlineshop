import { useState, useEffect } from 'react';
import { useSession } from '../contexts/AuthContext';
import AdminGuard from '@/components/AdminGuard';

export default function SystemTest() {
  const { data: session, status } = useSession();
  const [dbStatus, setDbStatus] = useState('checking');
  const [dbMessage, setDbMessage] = useState('Testing database connection...');
  const [envStatus, setEnvStatus] = useState({});

  useEffect(() => {
    testDatabase();
    checkEnvVariables();
  }, []);

  const checkEnvVariables = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      if (data.success) {
        setEnvStatus(data.data || {});
      }
    } catch (err) {
      console.error('Failed to check env variables:', err);
    }
  };

  const testDatabase = async () => {
    try {
      const response = await fetch('/api/db-test');
      const data = await response.json();
      
      if (data.success) {
        setDbStatus('success');
        setDbMessage('✅ Database connected successfully!');
      } else {
        setDbStatus('error');
        setDbMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setDbStatus('error');
      setDbMessage(`❌ Failed to connect: ${err.message}`);
    }
  };

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px' }}>System Status Check</h1>
      
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#334155', fontSize: '1.25rem', marginBottom: '16px' }}>
          🔐 Authentication Status
        </h2>
        <div style={{ 
          padding: '12px', 
          borderRadius: '8px',
          background: status === 'authenticated' ? '#dcfce7' : status === 'loading' ? '#fef3c7' : '#fee2e2',
          color: status === 'authenticated' ? '#166534' : status === 'loading' ? '#92400e' : '#991b1b'
        }}>
          <strong>Status:</strong> {status === 'authenticated' ? '✅ Logged In' : status === 'loading' ? '⏳ Loading...' : '❌ Not Logged In'}
        </div>
        
        {session && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <p><strong>User ID:</strong> {session.user?.id}</p>
            <p><strong>Email:</strong> {session.user?.email}</p>
            <p><strong>Name:</strong> {session.user?.firstName} {session.user?.lastName}</p>
            <p><strong>Role:</strong> {session.user?.role}</p>
          </div>
        )}
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#334155', fontSize: '1.25rem', marginBottom: '16px' }}>
          🗄️ Database Connection
        </h2>
        <div style={{ 
          padding: '12px', 
          borderRadius: '8px',
          background: dbStatus === 'success' ? '#dcfce7' : dbStatus === 'checking' ? '#fef3c7' : '#fee2e2',
          color: dbStatus === 'success' ? '#166534' : dbStatus === 'checking' ? '#92400e' : '#991b1b'
        }}>
          {dbMessage}
        </div>
        <button 
          onClick={testDatabase}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Test Again
        </button>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#334155', fontSize: '1.25rem', marginBottom: '16px' }}>
          ⚙️ Environment Variables
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {Object.entries(envStatus).map(([key, value]) => (
            <div key={key} style={{ 
              padding: '10px', 
              borderRadius: '6px',
              background: value ? '#dcfce7' : '#fee2e2',
              color: value ? '#166534' : '#991b1b',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              {value ? '✅' : '❌'} {key.replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#334155', fontSize: '1.25rem', marginBottom: '16px' }}>
          📝 Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a 
            href="/auth/signup"
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            Sign Up
          </a>
          <a 
            href="/auth/login"
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            Login
          </a>
          <a 
            href="/account"
            style={{
              padding: '10px 20px',
              background: '#8b5cf6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            My Account
          </a>
        </div>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '16px', 
        background: '#f1f5f9', 
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#64748b'
      }}>
        <p><strong>💡 Tip:</strong> Open your browser console (F12) to see detailed error messages when testing signup or login.</p>
        <p style={{marginTop: '8px'}}><strong>⚠️ Important:</strong> If you see "Database connection failed", restart your dev server (Ctrl+C, then npm run dev)</p>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#fef3c7', 
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#92400e'
      }}>
        <p><strong>🔧 Recent Fixes Applied:</strong></p>
        <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
          <li>Fixed Facebook provider causing NextAuth errors</li>
          <li>Improved MongoDB connection with timeout settings</li>
          <li>Cleaned up environment variables</li>
          <li>Added better error handling throughout</li>
        </ul>
      </div>
    </div>
  );
}

SystemTest.getLayout = function getLayout(page) {
  return <AdminGuard>{page}</AdminGuard>;
};
