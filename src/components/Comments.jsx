import { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, orderBy, query
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function Comments({ issueId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [issueId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'issues', issueId, 'comments'),
        orderBy('created_at', 'asc')
      );
      const snapshot = await getDocs(q);
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const user = auth.currentUser;
    if (!user) return;
    setSubmitting(true);
    try {
      const comment = {
        text: text.trim(),
        user_email: user.email,
        user_id: user.uid,
        created_at: new Date().toISOString(),
      };
      const ref = await addDoc(
        collection(db, 'issues', issueId, 'comments'),
        comment
      );
      setComments(prev => [...prev, { id: ref.id, ...comment }]);
      setText('');
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const isAuthority = (email) => {
    const AUTHORITY_EMAILS = ['authority@civicpulse.com'];
    return AUTHORITY_EMAILS.includes(email);
  };

  return (
    <div style={styles.container}>
      <p style={styles.title}>💬 Comments ({comments.length})</p>

      {loading ? (
        <p style={styles.muted}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={styles.muted}>No comments yet. Be the first to comment.</p>
      ) : (
        <div style={styles.list}>
          {comments.map(comment => (
            <div
              key={comment.id}
              style={{
                ...styles.comment,
                borderLeft: isAuthority(comment.user_email)
                  ? '3px solid #48bb78'
                  : '3px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={styles.commentHeader}>
                <span style={{
                  ...styles.email,
                  color: isAuthority(comment.user_email) ? '#48bb78' : '#4299e1',
                }}>
                  {isAuthority(comment.user_email) ? '🏛️ Authority' : '🏙️ ' + comment.user_email.split('@')[0]}
                </span>
                <span style={styles.time}>
                  {new Date(comment.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <p style={styles.commentText}>{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Write a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <button
          style={{ ...styles.sendBtn, opacity: submitting ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '...' : '➤'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: '16px',
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '14px',
    marginBottom: '12px',
  },
  muted: {
    color: '#718096',
    fontSize: '13px',
    marginBottom: '12px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  comment: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '10px 12px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  email: {
    fontSize: '12px',
    fontWeight: '600',
  },
  time: {
    color: '#718096',
    fontSize: '11px',
  },
  commentText: {
    color: '#e2e8f0',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '10px 12px',
    fontSize: '14px',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #4299e1, #667eea)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '10px 16px',
    fontSize: '16px',
    cursor: 'pointer',
  },
};