import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// fits bounds only on first load and when new pins are added — never on re-renders
function FitBounds({ issues }) {
  const map = useMap();
  const prevCount = useRef(0);

  useEffect(() => {
    if (issues.length === 0 || issues.length === prevCount.current) return;
    prevCount.current = issues.length;

    if (issues.length === 1) {
      map.setView([issues[0].location_lat, issues[0].location_lng], 14);
      return;
    }
    const lats = issues.map(i => i.location_lat);
    const lngs = issues.map(i => i.location_lng);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [48, 48], maxZoom: 15 }
    );
  }, [issues.length]);

  return null;
}

export default function IssueMap({ issues }) {
  const severityColor = {
    High: '#fc8181',
    Medium: '#ed8936',
    Low: '#48bb78',
  };

  const statusColor = {
    Reported: '#ed8936',
    'In Progress': '#4299e1',
    Resolved: '#48bb78',
  };

  // parse to numbers so Leaflet never gets strings or undefined
  const validIssues = issues
    .filter(i => i.location_lat != null && i.location_lng != null &&
                 i.location_lat !== 0 && i.location_lng !== 0)
    .map(i => ({
      ...i,
      location_lat: parseFloat(i.location_lat),
      location_lng: parseFloat(i.location_lng),
    }))
    .filter(i => !isNaN(i.location_lat) && !isNaN(i.location_lng));

  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
      {validIssues.length === 0 ? (
        <div style={styles.noMap}>
          <p style={{ color: '#718096', fontSize: '13px' }}>
            📍 Map pins will appear as issues are reported
          </p>
        </div>
      ) : (
        <MapContainer
          center={[validIssues[0].location_lat, validIssues[0].location_lng]}
          zoom={13}
          style={{ height: '300px', width: '100%' }}
          scrollWheelZoom={true}
          dragging={true}
          zoomControl={true}
          doubleClickZoom={true}
        >
          <TileLayer
            attribution='© OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds issues={validIssues} />
          {validIssues.map(issue => (
            <CircleMarker
              key={issue.id}
              center={[issue.location_lat, issue.location_lng]}
              radius={10}
              fillColor={severityColor[issue.severity] || '#4299e1'}
              color="#ffffff"
              weight={2}
              fillOpacity={0.9}
            >
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <strong>{issue.category}</strong><br />
                  <span style={{ color: severityColor[issue.severity] }}>
                    ⚠️ {issue.severity} severity
                  </span><br />
                  <small style={{ color: '#555' }}>{issue.description}</small><br />
                  <small>📍 {issue.location_name}</small><br />
                  <span style={{
                    background: statusColor[issue.status],
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    marginTop: '6px',
                    display: 'inline-block',
                  }}>
                    {issue.status}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      )}

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(severityColor).map(([s, c]) => (
          <div key={s} style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: c }} />
            <span style={styles.legendLabel}>{s}</span>
          </div>
        ))}
        <span style={{ ...styles.legendLabel, marginLeft: 'auto' }}>
          {validIssues.length} pinned
        </span>
      </div>
    </div>
  );
}

const styles = {
  noMap: {
    height: '100px',
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    padding: '10px 16px',
    background: '#1a1a2e',
    alignItems: 'center',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
  legendLabel: { color: '#a0aec0', fontSize: '12px' },
};
