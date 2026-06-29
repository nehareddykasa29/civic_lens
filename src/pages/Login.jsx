import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';

const AUTHORITY_EMAILS = ['authority@civicpulse.com'];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'citizen';
  const isAuthority = role === 'authority';

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }

      const isAuthorityEmail = AUTHORITY_EMAILS.includes(email);

      if (isAuthority && !isAuthorityEmail) {
        // citizen credentials used on authority login page — reject
        await signOut(auth);
        setError('This account does not have authority access.');
        setLoading(false);
        return;
      }

      if (!isAuthority && isAuthorityEmail) {
        // authority email used on citizen login page — redirect to correct page
        navigate('/authority');
        return;
      }

      navigate(isAuthorityEmail ? '/authority' : '/citizen');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Role Banner */}
        <div style={{
          ...styles.roleBanner,
          background: isAuthority
            ? 'rgba(72,187,120,0.15)'
            : 'rgba(66,153,225,0.15)',
          border: `1px solid ${isAuthority ? '#48bb78' : '#4299e1'}`,
        }}>
          <span style={{ fontSize: '24px' }}>{isAuthority ? '🏛️' : '🏙️'}</span>
          <div>
            <p style={{ ...styles.roleTitle, color: isAuthority ? '#48bb78' : '#4299e1' }}>
              {isAuthority ? 'Authority Access' : 'Citizen Access'}
            </p>
            <p style={styles.roleDesc}>
              {isAuthority
                ? 'Manage and resolve community issues'
                : 'Report and track community issues'}
            </p>
          </div>
        </div>

        <div style={styles.logo}>
          <h1 style={styles.logoText}>CivicPulse</h1>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>

        {isAuthority && (
          <div style={styles.demoBox}>
            <p style={styles.demoTitle}>Demo Credentials</p>
            <p style={styles.demoText}>📧 authority@civicpulse.com</p>
            <p style={styles.demoText}>🔑 nehakushi123</p>
          </div>
        )}

        <button style={styles.backBtn} onClick={() => navigate('/')}>
          ← Back to Home
        </button>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
  },
  roleBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  roleTitle: {
    fontWeight: '700',
    fontSize: '14px',
    margin: 0,
  },
  roleDesc: {
    color: '#a0aec0',
    fontSize: '12px',
    margin: 0,
    marginTop: '2px',
  },
  logo: { textAlign: 'center', marginBottom: '24px' },
  logoText: { color: '#ffffff', fontSize: '24px', fontWeight: '800' },
  tabs: {
    display: 'flex',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '24px',
  },
  tab: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#a0aec0',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tabActive: {
    background: '#4299e1',
    color: '#ffffff',
  },
  field: { marginBottom: '16px' },
  label: {
    color: '#a0aec0',
    fontSize: '13px',
    display: 'block',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '12px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  error: {
    color: '#fc8181',
    fontSize: '13px',
    marginBottom: '12px',
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    background: 'linear-gradient(135deg, #4299e1, #667eea)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  demoBox: {
    marginTop: '16px',
    background: 'rgba(72,187,120,0.08)',
    border: '1px solid rgba(72,187,120,0.25)',
    borderRadius: '10px',
    padding: '12px 16px',
    textAlign: 'center',
  },
  demoTitle: {
    color: '#48bb78',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '6px',
  },
  demoText: {
    color: '#a0aec0',
    fontSize: '13px',
    margin: '2px 0',
  },
  backBtn: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#718096',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '16px',
    textAlign: 'center',
  },
};