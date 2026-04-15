import { useMemo, useState } from 'react'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime, readFileAsDataUrl, buildDepartmentReputation } from '../lib/complaintUtils.js'
import { AGENTS } from '../lib/agents.js'

const ADMIN_USER = 'admin'
const ADMIN_PASS = '1234'

const FILTERS = [
  { key: 'total', label: 'All Complaints' },
  { key: 'notSeen', label: 'Awaiting Review' },
  { key: 'underProcess', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
]

function filterComplaints(key, complaints) {
  if (key === 'underProcess') return complaints.filter((c) => c.status === 'assigned' || c.status === 'in_progress')
  if (key === 'notSeen') return complaints.filter((c) => c.status === 'reported')
  if (key === 'resolved') return complaints.filter((c) => c.status === 'resolved')
  return complaints
}

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      onLogin()
    } else {
      setError('Invalid username or password.')
    }
  }

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
          <div className="section-label" style={{ marginBottom: 6 }}>Admin Panel</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>Sign In</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Access the operations dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Username</span>
            <input
              className="input-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Password</span>
            <input
              className="input-base"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 14px' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: 4 }}>
            Sign In →
          </button>
        </form>
      </div>
    </div>
  )
}

function ActionForm({ complaint, onSave }) {
  const [status, setStatus] = useState(complaint.status === 'resolved' ? 'in_progress' : complaint.status)
  const [remarks, setRemarks] = useState(complaint.remarks || '')
  const [markResolved, setMarkResolved] = useState(complaint.status === 'resolved')
  const [proofFile, setProofFile] = useState(null)
  const [selectedAgentId, setSelectedAgentId] = useState(complaint.assignedAgent?.id ?? '')
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const proofImageUrl = proofFile ? await readFileAsDataUrl(proofFile) : complaint.proofImageUrl
    const agent = AGENTS.find((a) => a.id === selectedAgentId) ?? complaint.assignedAgent
    await onSave(complaint.id, { status, remarks, markResolved, proofImageUrl, assignedAgent: agent })
    setFeedback('Updated successfully.')
    setTimeout(() => setFeedback(''), 3000)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Admin Actions</div>
        {feedback && <span style={{ fontSize: 12, color: 'var(--green)', background: 'var(--green-dim)', padding: '4px 12px', borderRadius: 99 }}>{feedback}</span>}
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</span>
        <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value)} disabled={markResolved}>
          <option value="reported">Reported</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
        </select>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}>
        <input type="checkbox" checked={markResolved} onChange={(e) => setMarkResolved(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--green)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Mark as Resolved</span>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Assign Agent</span>
        <select className="input-base" value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
          <option value="">— Select Agent —</option>
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>{a.name} · {a.role} {a.available ? '✓' : '(busy)'}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Remarks</span>
        <textarea className="input-base" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add remarks..." style={{ resize: 'vertical' }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Upload Proof Image</span>
        <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} className="input-base" style={{ padding: '10px 14px', cursor: 'pointer' }} />
      </label>

      <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Save Update</button>
    </form>
  )
}

function AdminDashboard({ onLogout }) {
  const { complaints, stats, updateComplaint } = useComplaints()
  const [activeFilter, setActiveFilter] = useState('total')
  const [selectedId, setSelectedId] = useState('')

  const filtered = useMemo(() => filterComplaints(activeFilter, complaints), [activeFilter, complaints])
  const selected = useMemo(() => complaints.find((c) => c.id === selectedId) ?? null, [complaints, selectedId])
  const departmentScores = useMemo(() => buildDepartmentReputation(complaints), [complaints])

  const agentReport = useMemo(() => {
    const assignedCountByAgent = complaints.reduce((acc, complaint) => {
      const agentId = complaint.assignedAgent?.id
      if (!agentId) return acc
      const current = acc.get(agentId) ?? { assigned: 0, resolved: 0, active: 0 }
      current.assigned += 1
      if (complaint.status === 'resolved') current.resolved += 1
      else current.active += 1
      acc.set(agentId, current)
      return acc
    }, new Map())

    return AGENTS
      .map((agent) => {
        const summary = assignedCountByAgent.get(agent.id) ?? { assigned: 0, resolved: 0, active: 0 }
        const resolutionRate = summary.assigned ? Math.round((summary.resolved / summary.assigned) * 100) : 0
        return { ...agent, ...summary, resolutionRate }
      })
      .filter((agent) => agent.assigned > 0)
      .sort((a, b) => b.assigned - a.assigned || b.resolutionRate - a.resolutionRate)
  }, [complaints])

  const statCards = [
    { key: 'total', label: 'Total', value: stats.total, color: 'var(--cyan)' },
    { key: 'notSeen', label: 'Awaiting', value: stats.notSeen, color: 'var(--amber)' },
    { key: 'underProcess', label: 'In Progress', value: stats.underProcess, color: 'var(--violet)' },
    { key: 'resolved', label: 'Resolved', value: stats.resolved, color: 'var(--green)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 4 }}>Admin</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>Operations Panel</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Two-pane control for complaints and workers.</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="btn-ghost"
            style={{ fontSize: 12, padding: '8px 16px', flexShrink: 0 }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {statCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setActiveFilter(card.key)}
            style={{
              background: activeFilter === card.key ? `${card.color}18` : 'var(--bg-card)',
              border: `1px solid ${activeFilter === card.key ? card.color + '55' : 'var(--border)'}`,
              borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color, fontFamily: "'Space Grotesk', sans-serif" }}>{card.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{card.label}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, minHeight: 640 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>Pane 1</div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Complaints</h2>
            </div>
            <span style={{ fontSize: 11, background: 'var(--cyan-dim)', color: 'var(--cyan)', padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>{filtered.length}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: `1px solid ${activeFilter === filter.key ? 'var(--cyan)' : 'var(--border)'}`,
                  background: activeFilter === filter.key ? 'var(--cyan-dim)' : 'transparent',
                  color: activeFilter === filter.key ? 'var(--cyan)' : 'var(--text-secondary)',
                  padding: '8px 10px',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
            {filtered.length ? filtered.map((c) => {
              const meta = STATUS_META[c.status]
              const isSelected = selected?.id === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 12px',
                    borderRadius: 12, border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--cyan-dim)' : 'transparent',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', width: '100%',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 5, boxShadow: `0 0 6px ${meta.color}` }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{c.complaintNumber}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--cyan)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{STATUS_META[c.status].shortLabel}</div>
                  </div>
                </button>
              )
            }) : (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: 12 }}>No complaints here</div>
            )}
          </div>

          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'rgba(56,189,248,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div>
                    <div className="section-label" style={{ marginBottom: 4 }}>{selected.complaintNumber}</div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.title}</h2>
                    {selected.reporterName && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Reported by: {selected.reporterName}</div>
                    )}
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: `${STATUS_META[selected.status].color}22`,
                    border: `1px solid ${STATUS_META[selected.status].color}55`,
                    color: STATUS_META[selected.status].color,
                    borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700,
                  }}>
                    {STATUS_META[selected.status].label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Category', value: formatCategory(selected.category, selected.otherCategory) },
                    { label: 'Reported', value: formatDateTime(selected.createdAt) },
                  ].map((item) => (
                    <div key={item.label} style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {selected.assignedAgent && (
                  <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 6 }}>Current Agent</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.assignedAgent.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.assignedAgent.role} · {selected.assignedAgent.phone}</div>
                  </div>
                )}

                {selected.imageUrl && (
                  <img src={selected.imageUrl} alt={selected.title} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 14 }} />
                )}
              </div>
              <ActionForm key={selected.id} complaint={selected} onSave={updateComplaint} />
            </div>
          ) : (
            <div style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Select a complaint to open its form
            </div>
          )}
        </section>

        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, minHeight: 640 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="section-label" style={{ marginBottom: 4 }}>Pane 2</div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Workers</h2>
          </div>

          <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4, 1fr)', gap: 8, padding: '10px 12px', background: 'rgba(56,189,248,0.04)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Worker</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Assigned</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Resolved</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Active</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>Rate</div>
            </div>
            <div style={{ maxHeight: 270, overflowY: 'auto' }}>
              {agentReport.length ? agentReport.map((agent) => (
                <div key={agent.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4, 1fr)', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.role}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'right' }}>{agent.assigned}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'right' }}>{agent.resolved}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', textAlign: 'right' }}>{agent.active}</div>
                  <div style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 700, textAlign: 'right' }}>{agent.resolutionRate}%</div>
                </div>
              )) : (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No worker activity yet</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Department Reputation Score</h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Avg resolution time, resolved ratio, reopened count</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {departmentScores.map((dept) => (
              <div key={dept.department} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{dept.department}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>{dept.score}/100</div>
                </div>
                <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avg: {dept.avgResolutionHours == null ? 'N/A' : `${dept.avgResolutionHours.toFixed(1)}h`}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>R/P: {dept.resolved}/{dept.pending}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Reopen: {dept.reopened}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_authed') === '1')

  function handleLogin() {
    sessionStorage.setItem('admin_authed', '1')
    setAuthed(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_authed')
    setAuthed(false)
  }

  if (!authed) return <AdminLogin onLogin={handleLogin} />
  return <AdminDashboard onLogout={handleLogout} />
}

export default Admin
