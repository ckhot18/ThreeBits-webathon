import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime, normalizeComplaintNumber } from '../lib/complaintUtils.js'
import { downloadComplaintReportPdf } from '../lib/reportPdf.js'

function StatusBadge({ status }) {
  const meta = STATUS_META[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `${meta.color}22`, border: `1px solid ${meta.color}55`,
      color: meta.color, borderRadius: 99, padding: '5px 14px',
      fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
      {meta.label}
    </span>
  )
}

function Track() {
  const { getComplaintByNumber } = useComplaints()
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState(params.get('complaint') ?? '')

  const complaint = useMemo(
    () => getComplaintByNumber(params.get('complaint') ?? ''),
    [getComplaintByNumber, params],
  )

  function handleSubmit(e) {
    e.preventDefault()
    const normalized = normalizeComplaintNumber(input)
    if (!normalized) return
    setParams({ complaint: normalized })
  }

  const agent = complaint?.assignedAgent ?? null

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <div className="section-label" style={{ marginBottom: 6 }}>ShikayatTrack</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>Track Your Complaint</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Enter your complaint ID to see real-time status and assigned agent details.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          className="input-base"
          style={{ flex: 1, minWidth: 220 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter complaint ID (e.g. SKT-2026-1042)"
        />
        <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
          Search →
        </button>
      </form>

      {/* Empty state */}
      {!params.get('complaint') && (
        <div style={{ background: 'var(--bg-card)', border: '2px dashed var(--border)', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Enter a complaint ID above to track its progress</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Example: SKT-2026-1042</div>
        </div>
      )}

      {/* Not found */}
      {params.get('complaint') && !complaint && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>No complaint found for "{params.get('complaint')}"</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Double-check the ID and try again.</div>
        </div>
      )}

      {/* Complaint details */}
      {complaint && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title + status */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 6 }}>{complaint.complaintNumber}</div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{complaint.title}</h2>
              </div>
              <StatusBadge status={complaint.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { label: 'Category', value: formatCategory(complaint.category, complaint.otherCategory) },
                { label: 'Reported On', value: formatDateTime(complaint.createdAt) },
                { label: 'Location', value: complaint.locationName },
                { label: 'Last Updated', value: formatDateTime(complaint.updatedAt) },
              ].map((item) => (
                <div key={item.label} style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => downloadComplaintReportPdf(complaint)}>
                Download PDF Report
              </button>
            </div>

            {complaint.imageUrl && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Submitted Photo</div>
                <img src={complaint.imageUrl} alt={complaint.title} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 14 }} />
              </div>
            )}

            {complaint.aiSummary && (
              <div style={{ marginTop: 14, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 6 }}>🤖 AI Analysis</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{complaint.aiSummary}</div>
                {complaint.aiSeverity && (
                  <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700, color: complaint.aiSeverity === 'critical' ? 'var(--red)' : complaint.aiSeverity === 'moderate' ? 'var(--amber)' : 'var(--green)', background: complaint.aiSeverity === 'critical' ? 'var(--red-dim)' : complaint.aiSeverity === 'moderate' ? 'var(--amber-dim)' : 'var(--green-dim)', padding: '3px 10px', borderRadius: 99 }}>
                    {complaint.aiSeverity.toUpperCase()} SEVERITY
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Agent card */}
          {agent ? (
            <div className="agent-card">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 14 }}>👷 Assigned Agent</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: '#050d1a',
                }}>
                  {agent.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{agent.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{agent.role}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ward: {agent.ward} · ID: {agent.id}</div>
                </div>
                <a href={`tel:${agent.phone}`} className="btn-primary" style={{ flexShrink: 0 }}>
                  📞 Call Agent
                </a>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(5,13,26,0.4)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                📱 {agent.phone}
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Agent Assignment</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Agent will be assigned once the complaint is reviewed by the admin.</div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Status Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {complaint.timeline.map((entry, i) => {
                const meta = STATUS_META[entry.status] ?? STATUS_META.reported
                const isLast = i === complaint.timeline.length - 1
                return (
                  <div key={i} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: meta.color, boxShadow: `0 0 10px ${meta.color}`, flexShrink: 0, marginTop: 2 }} />
                      {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--border)', margin: '4px 0' }} />}
                    </div>
                    <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{entry.note}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatDateTime(entry.timestamp)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resolution */}
          {complaint.status === 'resolved' && (
            <div style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(56,189,248,0.05))', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 20, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 14 }}>✅ Resolution Details</div>
              {complaint.remarks && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Remarks</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{complaint.remarks}</div>
                </div>
              )}
              {complaint.resolutionDescription && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Resolution Description</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{complaint.resolutionDescription}</div>
                </div>
              )}
              {complaint.proofImageUrl && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Proof Image</div>
                  <img src={complaint.proofImageUrl} alt="Resolution proof" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 14 }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Track
