import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MapView from '../components/MapView.jsx'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime, normalizeComplaintNumber, buildDepartmentReputation } from '../lib/complaintUtils.js'

const STAT_CONFIG = [
  { key: 'total', label: 'Total Complaints', color: 'var(--cyan)' },
  { key: 'notSeen', label: 'Awaiting Review', color: 'var(--amber)' },
  { key: 'underProcess', label: 'In Progress', color: 'var(--violet)' },
  { key: 'resolved', label: 'Resolved', color: 'var(--green)' },
]

function ComplaintModal({ complaint, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,13,26,0.85)', backdropFilter: 'blur(8px)', padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card fade-up" style={{ width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>{complaint.complaintNumber}</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{complaint.title}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '8px 16px', flexShrink: 0 }}>✕ Close</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Status', value: STATUS_META[complaint.status].label },
            { label: 'Category', value: formatCategory(complaint.category, complaint.otherCategory) },
            { label: 'Reported', value: formatDateTime(complaint.createdAt) },
            { label: 'Location', value: complaint.locationName },
          ].map((item) => (
            <div key={item.label} style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {complaint.assignedAgent && (
          <div className="agent-card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 10 }}>Assigned Agent</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{complaint.assignedAgent.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{complaint.assignedAgent.role} · {complaint.assignedAgent.ward}</div>
              </div>
              <a href={`tel:${complaint.assignedAgent.phone}`} className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
                📞 {complaint.assignedAgent.phone}
              </a>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {complaint.timeline.map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, background: 'rgba(56,189,248,0.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div className="timeline-dot" style={{ background: STATUS_META[entry.status]?.color ?? 'var(--cyan)', marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{STATUS_META[entry.status]?.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{entry.note}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatDateTime(entry.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Link to={`/track?complaint=${encodeURIComponent(complaint.complaintNumber)}`} className="btn-primary" style={{ fontSize: 13 }}>
            Full Details →
          </Link>
        </div>
      </div>
    </div>
  )
}

function Home() {
  const { complaints, stats, getComplaintByNumber } = useComplaints()
  const [trackInput, setTrackInput] = useState('')
  const [trackError, setTrackError] = useState('')
  const [modal, setModal] = useState(null)

  function handleQuickTrack(e) {
    e.preventDefault()
    setTrackError('')
    const normalized = normalizeComplaintNumber(trackInput)
    if (!normalized) return
    const c = getComplaintByNumber(normalized)
    if (!c) { setTrackError(`No complaint found for "${normalized}"`); return }
    setModal(c)
  }

  const departmentScores = useMemo(() => buildDepartmentReputation(complaints).slice(0, 4), [complaints])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(88,166,255,0.14) 0%, rgba(139,156,255,0.08) 45%, rgba(185,246,202,0.14) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 28,
        padding: 'clamp(20px, 3vw, 34px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,166,255,0.14) 0%, transparent 72%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, left: -70, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,246,202,0.22) 0%, transparent 72%)', pointerEvents: 'none' }} />

        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr minmax(280px, 0.9fr)', gap: 22, alignItems: 'stretch', position: 'relative' }}>
          <div>
            <div className="section-label" style={{ marginBottom: 10 }}></div>
            <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.15, color: 'var(--text-primary)' }}>
              ShikayatTrack<br />
              <span style={{ background: 'linear-gradient(90deg, #58a6ff, #8b9cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Command Center</span>
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: 500 }}>Report issues, route teams faster, and monitor city status from a <br />Smart city management panel issues, route teams faster, and monitor complaint status from a single clean control panel.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/report" className="btn-primary" style={{ fontSize: 16, padding: '14px 30px', borderRadius: 14 }}>
                Report Complaint
              </Link>
            </div>
          </div>

          {/* Quick track */}
          <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, backdropFilter: 'blur(6px)', alignSelf: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 8 }}>Quick Track</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Check complaint progress instantly using your complaint ID.</div>
            <form onSubmit={handleQuickTrack} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input-base"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="Enter complaint ID (e.g. SKT-2026-1042)"
              />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Search
              </button>
            </form>
            {trackError && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--red)' }}>{trackError}</p>}
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .hero-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </section>

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {STAT_CONFIG.map((s) => (
          <div key={s.key} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{stats[s.key]}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Department reputation snapshot */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 4 }}>Public Report</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Department Reputation Score</h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Based on resolution speed, resolved rate, and reopened complaints</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
          {departmentScores.map((dept) => (
            <div key={dept.department} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: 'rgba(56,189,248,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{dept.department}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>{dept.score}/100</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                Avg resolution: {dept.avgResolutionHours == null ? 'N/A' : `${dept.avgResolutionHours.toFixed(1)}h`} · Reopened: {dept.reopened}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Map */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 4 }}>Live Map</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Civic Pulse Map</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, display: 'inline-block', boxShadow: `0 0 6px ${meta.color}` }} />
                {meta.shortLabel}
              </span>
            ))}
          </div>
        </div>
        <MapView complaints={complaints} />
      </section>

      {modal && <ComplaintModal complaint={modal} onClose={() => setModal(null)} />}
    </div>
  )
}

export default Home
