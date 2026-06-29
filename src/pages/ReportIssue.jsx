import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeIssueImage, checkDuplicate } from '../gemini/analyze';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function ReportIssue() {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [category, setCategory] = useState('');
  const [locationName, setLocationName] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [duplicate, setDuplicate] = useState(null);
  const [allIssues, setAllIssues] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);

  // store GPS coords as soon as we get them — no re-render needed
  const coordsRef = useRef({ lat: null, lng: null });

  const categories = ['Pothole', 'Broken Light', 'Garbage', 'Flooding', 'Graffiti', 'Other'];

  // start GPS silently as soon as the page loads
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setGpsReady(true);
      },
      () => console.log('GPS unavailable'),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  // returns place name string — does NOT set state
  const getPlaceName = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const road = data.address?.road || data.address?.suburb || '';
      const city = data.address?.city || data.address?.town || data.address?.village || '';
      return `${road}${road && city ? ', ' : ''}${city}` || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // sets the location text field from coords
  const reverseGeocode = async (lat, lng) => {
    const name = await getPlaceName(lat, lng);
    setLocationName(name);
  };

  const handleGetLocation = async () => {
    setLocLoading(true);
    try {
      // use background GPS if already done
      if (coordsRef.current.lat) {
        await reverseGeocode(coordsRef.current.lat, coordsRef.current.lng);
        setLocLoading(false);
        return;
      }
      // otherwise request fresh
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      coordsRef.current = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setGpsReady(true);
      await reverseGeocode(position.coords.latitude, position.coords.longitude);
    } catch {
      alert('Could not get location. Please type it manually.');
    }
    setLocLoading(false);
  };

  // client-side duplicate check — reliable, no AI/network dependency
  const findClientDuplicate = (issues) => {
    const loc = locationName.toLowerCase();
    const locWords = loc.split(/[\s,]+/).filter(w => w.length > 3);
    return issues.find(issue => {
      if (issue.category?.toLowerCase() !== category.toLowerCase()) return false;
      const existingLoc = issue.location_name?.toLowerCase() || '';
      const existingWords = existingLoc.split(/[\s,]+/).filter(w => w.length > 3);
      return locWords.some(w => existingWords.includes(w));
    });
  };

  const handleAnalyze = async () => {
    if (!image || !category) {
      alert('Please upload an image and select a category');
      return;
    }
    if (!locationName) {
      alert('Please enter or detect your location first');
      return;
    }
    setLoading(true);
    try {
      const base64 = image.split(',')[1];
      const mimeType = imageFile.type;

      const [result, snapshot] = await Promise.all([
        analyzeIssueImage(base64, mimeType),
        getDocs(collection(db, 'issues')),
      ]);

      setAiResult(result);
      const issues = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllIssues(issues);

      // client-side duplicate check runs immediately — no AI rate-limit risk
      const clientDup = findClientDuplicate(issues);
      if (clientDup) {
        setDuplicate({
          is_duplicate: true,
          duplicate_id: clientDup.id,
          confidence: 'High',
          reason: `A ${category} issue was already reported near "${clientDup.location_name}". Consider upvoting it instead.`,
        });
      } else {
        // AI duplicate check as a secondary pass in background
        checkDuplicate(
          { category, location_name: locationName, description: result.description },
          issues
        ).then(dupResult => {
          if (dupResult?.is_duplicate && dupResult.confidence !== 'Low') {
            setDuplicate(dupResult);
          }
        }).catch(() => {});
      }

      setStep(2);
    } catch (err) {
      alert('Analysis failed. Please try again.');
      console.error(err);
    }
    setLoading(false);
  };

  const handleUpvoteExisting = async (id) => {
    try {
      const user = auth.currentUser;
      const issueRef = doc(db, 'issues', id);
      const issueSnap = await getDoc(issueRef);
      const voters = issueSnap.data().voters || [];
      if (voters.includes(user.uid)) {
        alert('You already upvoted this issue!');
        navigate('/citizen');
        return;
      }
      await updateDoc(issueRef, {
        upvotes: increment(1),
        voters: [...voters, user.uid],
      });
      alert('Thanks! Your upvote has been added.');
      navigate('/citizen');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // geocode the typed location first — text location always wins
      let lat = null;
      let lng = null;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`
        );
        const data = await res.json();
        if (data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch {
        console.log('Forward geocoding failed');
      }

      // fall back to background GPS only if geocoding gave nothing
      if (lat === null && coordsRef.current.lat !== null) {
        lat = coordsRef.current.lat;
        lng = coordsRef.current.lng;
      }

      await addDoc(collection(db, 'issues'), {
        category,
        severity: aiResult.severity,
        description: aiResult.description,
        suggested_action: aiResult.suggested_action,
        estimated_repair_time: aiResult.estimated_repair_time,
        location_name: locationName,
        location_lat: lat,
        location_lng: lng,
        image_url: image,
        status: 'Reported',
        upvotes: 0,
        voters: [],
        user_id: auth.currentUser?.uid,
        created_at: new Date().toISOString(),
      });
      setStep(3);
    } catch (err) {
      alert('Submission failed. Please try again.');
      console.error(err);
    }
    setSubmitting(false);
  };

  const severityColor = { Low: '#48bb78', Medium: '#ed8936', High: '#fc8181' };

  if (step === 3) return (
    <div style={styles.container}>
      <div style={styles.successBox}>
        <div style={{ fontSize: '64px' }}>✅</div>
        <h2 style={{ color: '#fff', marginTop: '16px' }}>Issue Reported!</h2>
        <p style={{ color: '#a0aec0', margin: '8px 0 24px' }}>
          Your report has been submitted successfully.
        </p>
        <button style={styles.btnPrimary} onClick={() => navigate('/citizen')}>
          Back to Map
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/citizen')}>← Back</button>
          <h2 style={styles.title}>Report an Issue</h2>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepRow}>
          {['Upload', 'Review', 'Done'].map((s, i) => (
            <div key={s} style={styles.stepItem}>
              <div style={{
                ...styles.stepDot,
                background: step > i ? '#4299e1' : 'rgba(255,255,255,0.1)',
              }} />
              <span style={{
                ...styles.stepLabel,
                color: step > i ? '#4299e1' : '#718096',
              }}>{s}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            {/* Image Upload */}
            <div
              style={styles.uploadBox}
              onClick={() => document.getElementById('imgInput').click()}
            >
              {image
                ? <img src={image} alt="preview" style={styles.preview} />
                : <div style={styles.uploadPlaceholder}>
                    <div style={{ fontSize: '40px' }}>📷</div>
                    <p style={{ color: '#a0aec0', marginTop: '8px' }}>Tap to upload photo</p>
                  </div>
              }
              <input
                id="imgInput"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Category */}
            <div style={styles.field}>
              <label style={styles.label}>Issue Category</label>
              <div style={styles.categoryGrid}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    style={{ ...styles.catBtn, ...(category === cat ? styles.catBtnActive : {}) }}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div style={styles.field}>
              <label style={styles.label}>Location / Landmark</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="e.g. MG Road, Bangalore or Anantapur Bus Stand"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                />
                <button
                  style={styles.locBtn}
                  onClick={handleGetLocation}
                  disabled={locLoading}
                  title="Use my location"
                >
                  {locLoading ? '⏳' : '📍'}
                </button>
              </div>
              {gpsReady && !locationName && (
                <p style={styles.coordsHint}>
                  ✅ GPS ready — tap 📍 to fill automatically
                </p>
              )}
              <p style={styles.locationTip}>
                Tip: Include landmark + city for accurate map pin
              </p>
            </div>

            <button
              style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? '🔍 Analyzing with AI...' : '✨ Analyze with AI'}
            </button>
          </>
        )}

        {step === 2 && aiResult && (
          <>
            <img
              src={image}
              alt="issue"
              style={{ ...styles.preview, marginBottom: '20px' }}
            />

            {/* Duplicate Warning */}
            {duplicate && (
              <div style={styles.dupBox}>
                <p style={styles.dupTitle}>⚠️ Similar Issue Already Reported</p>
                <p style={styles.dupDesc}>{duplicate.reason}</p>
                <button
                  style={styles.dupBtn}
                  onClick={() => handleUpvoteExisting(duplicate.duplicate_id)}
                >
                  👍 Upvote Existing Issue Instead
                </button>
                <button style={styles.dupSkip} onClick={() => setDuplicate(null)}>
                  No, this is different — continue reporting
                </button>
              </div>
            )}

            {/* AI Results */}
            <div style={styles.aiBox}>
              <p style={styles.aiLabel}>✨ AI Analysis</p>
              <div style={styles.aiRow}>
                <span style={styles.aiKey}>Severity</span>
                <span style={{ ...styles.aiBadge, background: severityColor[aiResult.severity] }}>
                  {aiResult.severity}
                </span>
              </div>
              <div style={styles.aiRow}>
                <span style={styles.aiKey}>Description</span>
                <span style={styles.aiValue}>{aiResult.description}</span>
              </div>
              <div style={styles.aiRow}>
                <span style={styles.aiKey}>Suggested Action</span>
                <span style={styles.aiValue}>{aiResult.suggested_action}</span>
              </div>
              <div style={styles.aiRow}>
                <span style={styles.aiKey}>Est. Repair Time</span>
                <span style={styles.aiValue}>{aiResult.estimated_repair_time}</span>
              </div>
            </div>

            {/* Location confirmation */}
            <div style={styles.locationConfirm}>
              <span style={{ fontSize: '16px' }}>📍</span>
              <span style={{ color: '#a0aec0', fontSize: '13px' }}>{locationName}</span>
            </div>

            <button
              style={{ ...styles.btnPrimary, opacity: submitting ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : '📤 Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f0f1a',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: '20px',
    padding: '24px',
    width: '100%',
    maxWidth: '480px',
    height: 'fit-content',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a0aec0',
    fontSize: '16px',
    cursor: 'pointer',
  },
  title: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
  },
  stepRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    marginBottom: '24px',
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  stepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  stepLabel: {
    fontSize: '11px',
  },
  uploadBox: {
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: '12px',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  uploadPlaceholder: { textAlign: 'center' },
  preview: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '12px',
  },
  field: { marginBottom: '20px' },
  label: {
    color: '#a0aec0',
    fontSize: '13px',
    marginBottom: '8px',
    display: 'block',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  catBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#a0aec0',
    padding: '10px 4px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  catBtnActive: {
    background: '#4299e1',
    border: '1px solid #4299e1',
    color: '#ffffff',
  },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '12px',
    fontSize: '14px',
    boxSizing: 'border-box',
    width: '100%',
  },
  locBtn: {
    background: 'rgba(66,153,225,0.2)',
    border: '1px solid #4299e1',
    borderRadius: '10px',
    color: '#4299e1',
    padding: '10px 14px',
    fontSize: '18px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  coordsHint: {
    color: '#48bb78',
    fontSize: '11px',
    marginTop: '6px',
  },
  locationTip: {
    color: '#718096',
    fontSize: '11px',
    marginTop: '4px',
  },
  btnPrimary: {
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
  aiBox: {
    background: 'rgba(66,153,225,0.1)',
    border: '1px solid rgba(66,153,225,0.3)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  aiLabel: {
    color: '#4299e1',
    fontWeight: '700',
    marginBottom: '12px',
    fontSize: '14px',
  },
  aiRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    gap: '12px',
  },
  aiKey: {
    color: '#a0aec0',
    fontSize: '13px',
    minWidth: '120px',
  },
  aiValue: {
    color: '#ffffff',
    fontSize: '13px',
    textAlign: 'right',
    flex: 1,
  },
  aiBadge: {
    borderRadius: '6px',
    padding: '2px 10px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
  },
  locationConfirm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '12px',
  },
  dupBox: {
    background: 'rgba(237,137,54,0.1)',
    border: '1px solid #ed8936',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  dupTitle: {
    color: '#ed8936',
    fontWeight: '700',
    fontSize: '14px',
    marginBottom: '8px',
  },
  dupDesc: {
    color: '#a0aec0',
    fontSize: '13px',
    marginBottom: '12px',
  },
  dupBtn: {
    width: '100%',
    background: '#ed8936',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '8px',
  },
  dupSkip: {
    width: '100%',
    background: 'transparent',
    color: '#718096',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  successBox: {
    textAlign: 'center',
    marginTop: '30vh',
  },
};
