import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function MyReports() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyIssues();
  }, []);

  const fetchMyIssues = async () => {
    try {
      const user = auth.currentUser;
      if (!user) { navigate('/'); return; }
      const q = query(collection(db, 'issues'), where('user_id', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setIssues(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

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
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/citizen')}>← Back</button>
        <h1 style={styles.title}>My Reports</h1>
      </div>

      {loading ? (
        <div style={styles.center}><p style={{ color: '#a0aec0' }}>Loading...</p></div>
      ) : issues.length === 0 ? (
        <div style={styles.center}>
          <div style={{ fontSize: '48px' }}>📋</div>
          <p style={{ color: '#a0aec0', marginTop: '12px' }}>No reports yet</p>
          <button style={styles.reportBtn} onClick={() => navigate('/report')}>
            Report an Issue
          </button>
        </div>
      ) : (
        <div style={styles.list}>
          {issues.map(issue => (
            <div key={issue.id} style={styles.card}>
              {issue.image_url && (
                <img src={issue.image_url} alt="issue" style={styles.cardImage} />
              )}
              <div style={styles.cardBody}>
                <div style={styles.cardTop}>
                  <span style={styles.category}>{issue.category}</span>
                  <div style={styles.badges}>
                    <span style={{ ...styles.badge, background: severityColor[issue.severity] }}>
                      {issue.severity}
                    </span>
                    <span style={{ ...styles.badge, background: statusColor[issue.status] }}>
                      {issue.status}
                    </span>
                  </div>
                </div>
                <p style={styles.description}>{issue.description}</p>
                <p style={styles.location}>📍 {issue.location_name}</p>
                <p style={styles.date}>
                  🕐 {new Date(issue.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>

                {/* Status Timeline */}
                <div style={styles.timeline}>
                  {['Reported', 'In Progress', 'Resolved'].map((s, i) => {
                    const statuses = ['Reported', 'In Progress', 'Resolved'];
                    const currentIndex = statuses.indexOf(issue.status);
                    const isDone = i <= currentIndex;
                    return (
                      <div key={s} style={styles.timelineItem}>
                        <div style={{
                          ...styles.timelineDot,
                          background: isDone ? statusColor[s] : 'rgba(255,255,255,0.1)',
                        }} />
                        <span style={{
                          ...styles.timelineLabel,
                          color: isDone ? '#ffffff' : '#718096',
                        }}>{s}</span>
                        {i < 2 && (
                          <div style={{
                            ...styles.timelineLine,
                            background: i < currentIndex ? '#48bb78' : 'rgba(255,255,255,0.1)',
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
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
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '20px 16px', background: '#1a1a2e',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: { background: 'transparent', border: 'none', color: '#a0aec0', fontSize: '16px', cursor: 'pointer' },
  title: { color: '#ffffff', fontSize: '20px', fontWeight: '700' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' },
  reportBtn: {
    background: 'linear-gradient(135deg, #4299e1, #667eea)',
    color: 'white', border: 'none', borderRadius: '12px',
    padding: '12px 24px', fontSize: '15px', fontWeight: '600',
    cursor: 'pointer', marginTop: '8px',
  },
  list: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '0 auto' },
  card: { background: '#1a1a2e', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' },
  cardImage: { width: '100%', height: '160px', objectFit: 'cover' },
  cardBody: { padding: '16px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  category: { color: '#ffffff', fontWeight: '700', fontSize: '16px' },
  badges: { display: 'flex', gap: '6px' },
  badge: { borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', color: '#fff' },
  description: { color: '#a0aec0', fontSize: '13px', lineHeight: '1.5', marginBottom: '8px' },
  location: { color: '#718096', fontSize: '12px', marginBottom: '4px' },
  date: { color: '#718096', fontSize: '12px', marginBottom: '16px' },
  timeline: { display: 'flex', alignItems: 'center' },
  timelineItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  timelineDot: { width: '12px', height: '12px', borderRadius: '50%', marginBottom: '4px' },
  timelineLabel: { fontSize: '10px', textAlign: 'center' },
  timelineLine: { position: 'absolute', top: '6px', left: '50%', width: '100%', height: '2px' },
};