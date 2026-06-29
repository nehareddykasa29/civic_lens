import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>CivicLens</h1>
        <p style={styles.subtitle}>Report. Track. Resolve. Together.</p>
      </div>

      <div style={styles.cards}>
        <div style={styles.card} onClick={() => navigate('/login?role=citizen')}>
          <div style={styles.icon}>🏙️</div>
          <h2 style={styles.cardTitle}>I'm a Citizen</h2>
          <p style={styles.cardDesc}>Report issues, track status, help your community</p>
          <button style={styles.btnCitizen}>Continue as Citizen</button>
        </div>

        <div style={styles.card} onClick={() => navigate('/login?role=authority')}>
          <div style={styles.icon}>🏛️</div>
          <h2 style={styles.cardTitle}>I'm an Authority</h2>
          <p style={styles.cardDesc}>Manage reports, update status, view dashboard</p>
          <button style={styles.btnAuthority}>Continue as Authority</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  title: {
    fontSize: '48px',
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: '12px',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#a0aec0',
    letterSpacing: '2px',
  },
  cards: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '40px 32px',
    width: '280px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '8px',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#a0aec0',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  btnCitizen: {
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  btnAuthority: {
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
};