import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import Comments from '../components/Comments';

export default function AuthorityHome() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'issues'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setIssues(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const updateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, 'issues', id), { status: newStatus });
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };

  const statuses = ['Reported', 'In Progress', 'Resolved'];
  const filters = ['All', 'Reported', 'In Progress', 'Resolved'];

  const filtered = filter === 'All' ? issues : issues.filter(i => i.status === filter);

  const statusColor = {
    'Reported': '#ed8936',
    'In Progress': '#4299e1',
    'Resolved': '#48bb78',
  };

  const severityColor = {
    'Low': '#48bb78',
    'Medium': '#ed8936',
    'High': '#fc8181',
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>CivicPulse</h1>
          <p style={styles.subtitle}>Authority Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.dashBtn} onClick={() => navigate('/dashboard')}>
            📊 Dashboard
          </button>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        {['Reported', 'In Progress', 'Resolved'].map(s => (
          <div key={s} style={styles.statCard}>
            <div style={{ ...styles.statNum, color: statusColor[s] }}>
              {issues.filter(i => i.status === s).length}
            </div>
            <div style={styles.statLabel}>{s}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {filters.map(f => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Issues List */}
      {loading ? (
        <div style={styles.center}><p style={{ color: '#a0aec0' }}>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div style={styles.center}><p style={{ color: '#a0aec0' }}>No issues found</p></div>
      ) : (
        <div style={styles.list}>
          {filtered.map(issue => (
            <div key={issue.id} style={styles.card}>
              {issue.image_url && (
                <img src={issue.image_url} alt="issue" style={styles.cardImage} />
              )}
              <div style={styles.cardBody}>
                <div style={styles.cardTop}>
                  <span style={styles.category}>{issue.category}</span>
                  <span style={{ ...styles.badge, background: severityColor[issue.severity] }}>
                    {issue.severity}
                  </span>
                </div>

                <p style={styles.description}>{issue.description}</p>
                <p style={styles.action}>💡 {issue.suggested_action}</p>
                <p style={styles.location}>📍 {issue.location_name}</p>
                <p style={styles.time}>⏱ Est. repair: {issue.estimated_repair_time}</p>

                {/* Status Updater */}
                <div style={styles.statusRow}>
                  <span style={styles.statusLabel}>Status:</span>
                  <div style={styles.statusBtns}>
                    {statuses.map(s => (
                      <button
                        key={s}
                        style={{
                          ...styles.statusBtn,
                          background: issue.status === s ? statusColor[s] : 'rgba(255,255,255,0.05)',
                          color: issue.status === s ? '#fff' : '#a0aec0',
                          border: `1px solid ${issue.status === s ? statusColor[s] : 'rgba(255,255,255,0.1)'}`,
                        }}
                        onClick={() => updateStatus(issue.id, s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Comments issueId={issue.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f1a', paddingBottom: '40px' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 16px', background: '#1a1a2e',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  title: { color: '#ffffff', fontSize: '22px', fontWeight: '800' },
  subtitle: { color: '#a0aec0', fontSize: '12px', marginTop: '2px' },
  dashBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#a0aec0', borderRadius: '10px', padding: '10px 16px',
    fontSize: '14px', cursor: 'pointer',
  },
  logoutBtn: {
    background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.3)',
    color: '#fc8181', borderRadius: '10px', padding: '10px 16px',
    fontSize: '14px', cursor: 'pointer',
  },
  statsRow: {
    display: 'flex', gap: '12px', padding: '16px',
    maxWidth: '600px', margin: '0 auto',
  },
  statCard: {
    flex: 1, background: '#1a1a2e', borderRadius: '12px',
    padding: '16px', textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  statNum: { fontSize: '28px', fontWeight: '800' },
  statLabel: { color: '#a0aec0', fontSize: '11px', marginTop: '4px' },
  filterRow: {
    display: 'flex', gap: '8px', padding: '0 16px 16px',
    maxWidth: '600px', margin: '0 auto', flexWrap: 'wrap',
  },
  filterBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#a0aec0', borderRadius: '8px', padding: '8px 16px',
    fontSize: '13px', cursor: 'pointer',
  },
  filterBtnActive: { background: '#4299e1', border: '1px solid #4299e1', color: '#fff' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' },
  list: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '0 auto' },
  card: { background: '#1a1a2e', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' },
  cardImage: { width: '100%', height: '160px', objectFit: 'cover' },
  cardBody: { padding: '16px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  category: { color: '#ffffff', fontWeight: '700', fontSize: '16px' },
  badge: { borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', color: '#fff' },
  description: { color: '#a0aec0', fontSize: '13px', lineHeight: '1.5', marginBottom: '8px' },
  action: { color: '#4299e1', fontSize: '12px', marginBottom: '6px' },
  location: { color: '#718096', fontSize: '12px', marginBottom: '4px' },
  time: { color: '#718096', fontSize: '12px', marginBottom: '12px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  statusLabel: { color: '#a0aec0', fontSize: '13px' },
  statusBtns: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  statusBtn: { borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
};