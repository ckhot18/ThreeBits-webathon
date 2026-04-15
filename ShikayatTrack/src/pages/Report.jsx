import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { CATEGORY_OPTIONS, readFileAsDataUrl } from '../lib/complaintUtils.js'
import { analyzeComplaintImage } from '../lib/aiAnalysis.js'
import { downloadComplaintReportPdf } from '../lib/reportPdf.js'

const STEPS = ['Upload', 'Details', 'Submitted']

function AiResultBadge({ result }) {
  if (!result) return null
  const severityColor = { critical: 'var(--red)', moderate: 'var(--amber)', minor: 'var(--green)' }[result.severity] ?? 'var(--cyan)'
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(185,246,202,0.45), rgba(255,193,7,0.08))', border: '1px solid rgba(0,77,64,0.18)', borderRadius: 14, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>🤖</span>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cyan)' }}>AI Analysis Complete</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: severityColor, background: `${severityColor}22`, padding: '2px 10px', borderRadius: 99 }}>
          {result.severity?.toUpperCase()}
        </span>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{result.summary}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Detected category:</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>{result.detectedCategory}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Confidence:</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: result.confidence === 'high' ? 'var(--green)' : result.confidence === 'medium' ? 'var(--amber)' : 'var(--red)' }}>{result.confidence}</span>
      </div>
    </div>
  )
}

function Report() {
  const { createComplaint } = useComplaints()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState(0)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [imageCoords, setImageCoords] = useState(null)
  const [locationSource, setLocationSource] = useState('none') // ai_text | current | auto | none
  const [locationLabel, setLocationLabel] = useState('')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('water')
  const [otherCategory, setOtherCategory] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdComplaint, setCreatedComplaint] = useState(null)
  const [showPrintPopup, setShowPrintPopup] = useState(false)

  // Current location state
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle') // idle | requesting | granted | denied

  function handleDownloadPdf() {
    if (!createdComplaint) return
    try {
      downloadComplaintReportPdf(createdComplaint)
    } catch (err) {
      setError(err.message || 'Could not generate PDF right now. Please try again.')
    }
  }

  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('granted')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    )
  }, [])

  async function handleImageChange(file) {
    if (!file) return
    setImageFile(file)
    setAiResult(null)
    setError('')
    setImageCoords(null)
    setLocationSource('none')
    setLocationLabel('')

    const preview = URL.createObjectURL(file)
    setImagePreview(preview)

    setAnalyzing(true)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const result = await analyzeComplaintImage(dataUrl, { contextText: file.name })
      setAiResult(result)
      if (result.detectedCategory && result.detectedCategory !== 'other' && result.confidence !== 'low') {
        setCategory(result.detectedCategory)
      }
      if (result.locationCoords) {
        setImageCoords(result.locationCoords)
        setLocationSource('ai_text')
        setLocationLabel(result.locationText ? `Detected: ${result.locationText}` : 'Detected from photo text')
      }
    } catch {
      // silently fail
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('Please enter a title for the complaint.'); return }
    if (category === 'other' && !otherCategory.trim()) { setError('Please specify the category.'); return }

    setSubmitting(true)
    try {
      const imageUrl = imageFile ? await readFileAsDataUrl(imageFile) : ''
      // Priority: photo text location > current location > null (context generates random)
      const coords = imageCoords || currentLocation || null
      const effectiveLocationSource = imageCoords
        ? locationSource
        : (currentLocation ? 'current' : 'auto')
      const effectiveLocationName = imageCoords
        ? (locationLabel || 'Photo detected location')
        : currentLocation
          ? 'Current device location'
          : 'Citizen report zone'
      const complaint = await createComplaint({
        title, category, otherCategory, imageUrl,
        aiSummary: aiResult?.summary ?? '',
        aiSeverity: aiResult?.severity ?? '',
        detectedCategory: aiResult?.detectedCategory ?? '',
        reporterName,
        coordinates: coords,
        locationName: effectiveLocationName,
      })
      setLocationSource(effectiveLocationSource)
      setCreatedComplaint(complaint)
      setShowPrintPopup(true)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const assignedAgent = createdComplaint?.assignedAgent ?? null

  // Location badge
  const locationBadge = imageCoords && locationSource === 'ai_text'
    ? { icon: '🧭', text: `${locationLabel || 'Detected location from photo text'} (${imageCoords.lat.toFixed(5)}, ${imageCoords.lng.toFixed(5)})`, color: 'var(--cyan)' }
    : locationStatus === 'granted' && currentLocation
    ? { icon: '📍', text: `Using your current location`, color: 'var(--cyan)' }
    : locationStatus === 'requesting'
    ? { icon: '⏳', text: 'Getting your location...', color: 'var(--amber)' }
    : { icon: '📍', text: 'Location will be auto-assigned', color: 'var(--text-muted)' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>ShikayatTrack</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>Report a Civic Issue</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Upload a photo, verify details, and submit quickly.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{
            flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: step === i ? 'linear-gradient(135deg, rgba(185,246,202,0.55), rgba(255,193,7,0.15))' : 'transparent',
            color: step === i ? 'var(--cyan)' : step > i ? 'var(--green)' : 'var(--text-muted)',
            border: step === i ? '1px solid rgba(0,77,64,0.22)' : '1px solid transparent',
            transition: 'all 0.3s',
          }}>
            {step > i ? '✓ ' : `${i + 1}. `}{s}
          </div>
        ))}
      </div>

      {step === 2 && createdComplaint ? (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(185,246,202,0.55), rgba(255,193,7,0.12))', border: '1px solid rgba(0,77,64,0.2)', borderRadius: 20, padding: 28, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>Complaint Submitted!</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: 14 }}>Your complaint has been registered. A worker is assigned after submission.</p>
            <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px', display: 'inline-block', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Complaint ID</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.05em' }}>{createdComplaint.complaintNumber}</div>
            </div>
          </div>

          {assignedAgent && (
            <div className="agent-card">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 12 }}>Auto-Assigned Agent</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{assignedAgent.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{assignedAgent.role}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ward: {assignedAgent.ward}</div>
                </div>
                <a href={`tel:${assignedAgent.phone}`} className="btn-primary">📞 {assignedAgent.phone}</a>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to={`/track?complaint=${encodeURIComponent(createdComplaint.complaintNumber)}`} className="btn-primary">Track This Complaint</Link>
            <button type="button" className="btn-ghost" onClick={() => setShowPrintPopup(true)}>
              Print Details
            </button>
            <button type="button" className="btn-ghost" onClick={() => {
              setStep(0)
              setImageFile(null)
              setImagePreview('')
              setAiResult(null)
              setTitle('')
              setReporterName('')
              setCreatedComplaint(null)
              setImageCoords(null)
              setLocationSource('none')
              setLocationLabel('')
              setShowPrintPopup(false)
            }}>
              Report Another
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Left: Image upload + AI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Step 1 — Upload Photo</div>

              {imagePreview ? (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 14, display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(''); setAiResult(null); setImageCoords(null) }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    ✕ Remove
                  </button>
                  {analyzing && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <div style={{ fontSize: 13, color: 'var(--cyan)', fontWeight: 600 }}>Analyzing image...</div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', height: 180, background: 'rgba(185,246,202,0.3)', border: '2px dashed rgba(0,77,64,0.24)',
                    borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 10, cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s', marginBottom: 12,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.background = 'rgba(185,246,202,0.44)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,77,64,0.24)'; e.currentTarget.style.background = 'rgba(185,246,202,0.3)' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Upload Issue Photo</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>AI will auto-detect the issue type</div>
                  </div>
                </button>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)} />

              {!imagePreview && (
                <button type="button" className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
                  Choose Photo
                </button>
              )}

              {/* Location badge */}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(185,246,202,0.24)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <span style={{ fontSize: 14 }}>{locationBadge.icon}</span>
                <span style={{ fontSize: 12, color: locationBadge.color }}>{locationBadge.text}</span>
                {locationStatus === 'denied' && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 8px' }}
                    onClick={() => {
                      setLocationStatus('requesting')
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                          setLocationStatus('granted')
                        },
                        () => setLocationStatus('denied'),
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
                      )
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>

              <AiResultBadge result={aiResult} />
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(185,246,202,0.5), rgba(255,193,7,0.08))', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 12 }}>Process Overview</div>
              {[
                { text: 'AI analyzes the photo and suggests category and severity.' },
                { text: 'After submission, an available field team is assigned.' },
                { text: 'Your complaint appears on the city map.' },
                { text: 'Use complaint ID to track updates anytime.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Step 2 — Complaint Details</div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Issue Title *</span>
                <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water leakage near school gate" />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Category
                  {aiResult && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--cyan)' }}>← AI suggested</span>}
                </span>
                <select className="input-base" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>

              {category === 'other' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Specify Category *</span>
                  <input className="input-base" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} placeholder="Describe the issue type" />
                </label>
              )}

              {/* Optional name field */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Your Name
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>optional — leave blank to stay anonymous</span>
                </span>
                <input
                  className="input-base"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Anonymous"
                />
              </label>

              {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 14px' }}>{error}</p>}

              <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center', marginTop: 4 }}>
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPrintPopup && createdComplaint && (
        <div className="print-overlay" role="dialog" aria-modal="true">
          <div className="print-card" id="complaint-print-card">
            <h3 style={{ marginTop: 0, marginBottom: 12, color: 'var(--text-primary)' }}>Complaint Receipt</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'grid', gap: 6 }}>
              <div><strong>ID:</strong> {createdComplaint.complaintNumber}</div>
              <div><strong>Title:</strong> {createdComplaint.title}</div>
              <div><strong>Category:</strong> {createdComplaint.category}</div>
              <div><strong>Location:</strong> {createdComplaint.locationName}</div>
              <div><strong>Submitted:</strong> {new Date(createdComplaint.createdAt).toLocaleString()}</div>
              {createdComplaint.assignedAgent && (
                <>
                  <div><strong>Assigned Worker:</strong> {createdComplaint.assignedAgent.name}</div>
                  <div><strong>Role:</strong> {createdComplaint.assignedAgent.role}</div>
                  <div><strong>Contact:</strong> {createdComplaint.assignedAgent.phone}</div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-primary" onClick={handleDownloadPdf}>Download PDF</button>
              <button type="button" className="btn-primary" onClick={() => window.print()}>Print</button>
              <button type="button" className="btn-ghost" onClick={() => setShowPrintPopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .print-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,77,64,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1500;
        }
        .print-card {
          width: min(560px, 100%);
          border-radius: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          padding: 18px;
          box-shadow: 0 24px 50px rgba(2, 6, 23, 0.45);
        }
        @media print {
          body * { visibility: hidden; }
          #complaint-print-card, #complaint-print-card * { visibility: visible; }
          #complaint-print-card {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
            border-radius: 0;
            background: #fff;
            color: #000;
          }
        }
      `}</style>
    </div>
  )
}

export default Report
