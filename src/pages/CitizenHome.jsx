import Comments from '../components/Comments';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import IssueMap from '../components/IssueMap';

export default function CitizenHome() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const fetchIssues = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'issues'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIssues(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleUpvote = async (id) => {
  const user = auth.currentUser;
  if (!user) return;

  const issueRef = doc(db, 'issues', id);
  const issueSnap = await getDoc(issueRef);
  const voters = issueSnap.data().voters || [];

  if (voters.includes(user.uid)) {
    alert('You already upvoted this issue');
    return;
  }

  await updateDoc(issueRef, {
    upvotes: increment(1),
    voters: [...voters, user.uid]
  });

  setIssues(prev => prev.map(i =>
    i.id === id ? { ...i, upvotes: i.upvotes + 1 } : i
  ));
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
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>CivicPulse</h1>
          <p style={styles.subtitle}>Community Issues</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={styles.reportBtn} onClick={() => navigate('/report')}>
            + Report
          </button>
          <div style={{ position: 'relative' }}>
            <button style={styles.menuBtn} onClick={() => setMenuOpen(o => !o)}>
              ⋮
            </button>
            {menuOpen && (
              <>
                <div style={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
                <div style={styles.dropdown}>
                  <button style={styles.dropItem} onClick={() => { navigate('/my-reports'); setMenuOpen(false); }}>
                    📋 My Reports
                  </button>
                  <button style={{ ...styles.dropItem, color: '#fc8181' }} onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Map Section */}
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        <IssueMap issues={issues} />
      </div>
      {/* Issues List */}
      {loading ? (
        <div style={styles.center}>
          <p style={{ color: '#a0aec0' }}>Loading issues...</p>
        </div>
      ) : issues.length === 0 ? (
        <div style={styles.center}>
          <div style={{ fontSize: '48px' }}>🏙️</div>
          <p style={{ color: '#a0aec0', marginTop: '12px' }}>No issues reported yet</p>
          <p style={{ color: '#718096', fontSize: '14px' }}>Be the first to report one</p>
        </div>
      ) : (
        <div style={styles.list}>
          {issues.map(issue => (
            <div key={issue.id} style={styles.card}>
              {/* Image */}
              {issue.image_url && (
                <img src={issue.image_url} alt="issue" style={styles.cardImage} />
              )}

              {/* Content */}
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

                <div style={styles.cardFooter}>
                  <span style={styles.location}>📍 {issue.location_name}</span>
                  <button
                    style={styles.upvoteBtn}
                    onClick={() => handleUpvote(issue.id)}
                  >
                    👍 {issue.upvotes}
                  </button>
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
  container: {
    minHeight: '100vh',
    background: '#0f0f1a',
    paddingBottom: '40px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 16px',
    background: '#1a1a2e',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '800',
  },
  subtitle: {
    color: '#a0aec0',
    fontSize: '12px',
    marginTop: '2px',
  },
  reportBtn: {
    background: 'linear-gradient(135deg, #4299e1, #667eea)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    textAlign: 'center',
  },
  list: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  cardImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
  },
  cardBody: {
    padding: '16px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  category: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '16px',
  },
  badges: {
    display: 'flex',
    gap: '6px',
  },
  badge: {
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    color: '#a0aec0',
    fontSize: '13px',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  location: {
    color: '#718096',
    fontSize: '12px',
  },
  upvoteBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#a0aec0',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: 'pointer',
  },

menuBtn: {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#a0aec0',
  padding: '10px 14px',
  fontSize: '18px',
  cursor: 'pointer',
  lineHeight: 1,
},
menuOverlay: {
  position: 'fixed',
  inset: 0,
  zIndex: 20,
},
dropdown: {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  background: '#1e2140',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  padding: '6px',
  zIndex: 30,
  minWidth: '160px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
},
dropItem: {
  display: 'block',
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#e2e8f0',
  padding: '10px 14px',
  fontSize: '14px',
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: '8px',
},
};