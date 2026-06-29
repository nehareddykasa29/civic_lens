import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'issues'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setIssues(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // compute stats
  const total = issues.length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const reported = issues.filter(i => i.status === 'Reported').length;
  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;

  const statusData = [
    { name: 'Reported', value: reported, color: '#ed8936' },
    { name: 'In Progress', value: inProgress, color: '#4299e1' },
    { name: 'Resolved', value: resolved, color: '#48bb78' },
  ].filter(d => d.value > 0);

  const categoryCount = issues.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

  const severityCount = issues.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] || 0) + 1;
    return acc;
  }, {});
  const severityData = [
    { name: 'Low', value: severityCount['Low'] || 0, color: '#48bb78' },
    { name: 'Medium', value: severityCount['Medium'] || 0, color: '#ed8936' },
    { name: 'High', value: severityCount['High'] || 0, color: '#fc8181' },
  ];

  // top locations
  const locationCount = issues.reduce((acc, i) => {
    acc[i.location_name] = (acc[i.location_name] || 0) + 1;
    return acc;
  }, {});
  const topLocations = Object.entries(locationCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (loading) return (
    <div style={styles.center}>
      <p style={{ color: '#a0aec0' }}>Loading dashboard...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/authority')}>← Back</button>
        <h1 style={styles.title}>Impact Dashboard</h1>
      </div>

      <div style={styles.content}>
        {/* KPI Cards */}
        <div style={styles.kpiRow}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiNum}>{total}</div>
            <div style={styles.kpiLabel}>Total Issues</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiNum, color: '#48bb78' }}>{resolutionRate}%</div>
            <div style={styles.kpiLabel}>Resolution Rate</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiNum, color: '#4299e1' }}>{inProgress}</div>
            <div style={styles.kpiLabel}>In Progress</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiNum, color: '#fc8181' }}>
              {issues.filter(i => i.severity === 'High' && i.status !== 'Resolved').length}
            </div>
            <div style={styles.kpiLabel}>High Priority</div>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Issues by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={styles.noData}>No data yet</p>}
        </div>

        {/* Category Bar Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Issues by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#a0aec0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#a0aec0', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', color: '#fff' }} />
                <Bar dataKey="value" fill="#4299e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={styles.noData}>No data yet</p>}
        </div>

        {/* Severity Chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Issues by Severity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={severityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#a0aec0', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a0aec0', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', color: '#fff' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Locations */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Most Affected Areas</h3>
          {topLocations.length > 0 ? (
            <div style={styles.locationList}>
              {topLocations.map(([location, count], i) => (
                <div key={i} style={styles.locationRow}>
                  <div style={styles.locationRank}>#{i + 1}</div>
                  <div style={styles.locationName}>{location}</div>
                  <div style={styles.locationBar}>
                    <div style={{
                      ...styles.locationBarFill,
                      width: `${(count / topLocations[0][1]) * 100}%`
                    }} />
                  </div>
                  <div style={styles.locationCount}>{count}</div>
                </div>
              ))}
            </div>
          ) : <p style={styles.noData}>No data yet</p>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0f0f1a', paddingBottom: '40px' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' },
  header: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '20px 16px', background: '#1a1a2e',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  backBtn: {
    background: 'transparent', border: 'none',
    color: '#a0aec0', fontSize: '16px', cursor: 'pointer',
  },
  title: { color: '#ffffff', fontSize: '20px', fontWeight: '700' },
  content: { padding: '16px', maxWidth: '600px', margin: '0 auto' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' },
  kpiCard: {
    background: '#1a1a2e', borderRadius: '16px', padding: '20px',
    textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)',
  },
  kpiNum: { fontSize: '32px', fontWeight: '800', color: '#ffffff' },
  kpiLabel: { color: '#a0aec0', fontSize: '12px', marginTop: '4px' },
  chartCard: {
    background: '#1a1a2e', borderRadius: '16px', padding: '20px',
    marginBottom: '16px', border: '1px solid rgba(255,255,255,0.08)',
  },
  chartTitle: { color: '#ffffff', fontSize: '15px', fontWeight: '700', marginBottom: '16px' },
  noData: { color: '#718096', textAlign: 'center', padding: '20px' },
  locationList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  locationRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  locationRank: { color: '#4299e1', fontWeight: '700', fontSize: '13px', width: '24px' },
  locationName: { color: '#ffffff', fontSize: '13px', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  locationBar: { flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '8px' },
  locationBarFill: { background: '#4299e1', borderRadius: '4px', height: '8px', transition: 'width 0.5s' },
  locationCount: { color: '#a0aec0', fontSize: '13px', width: '20px', textAlign: 'right' },
};