import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import MapView from '../components/MapView.jsx'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META } from '../lib/complaintUtils.js'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'reported', label: 'Reported' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
]

function MapPage() {
  const { complaints } = useComplaints()
  const [filter, setFilter] = useState('all')
  const location = useLocation()

  // Support ?lat=xx&lng=yy to highlight a specific location
  const params = new URLSearchParams(location.search)
  const highlightLat = parseFloat(params.get('lat'))
  const highlightLng = parseFloat(params.get('lng'))
  const highlightCoords = Number.isFinite(highlightLat) && Number.isFinite(highlightLng)
    ? { lat: highlightLat, lng: highlightLng }
    : null

  const filtered = filter === 'all' ? complaints : complaints.filter((c) => c.status === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div className="section-label" style={{ marginBottom: 6 }}>ShikayatTrack</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>Civic Pulse Map</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Real-time complaint map with AI-assigned agent info on each pin.
        </p>
      </div>

      {highlightCoords && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12 }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>
            Showing photo location: {highlightCoords.lat.toFixed(5)}, {highlightCoords.lng.toFixed(5)}
          </span>
        </div>
      )}

      {/* Filter + legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: filter === f.key ? `1px solid ${f.key === 'all' ? 'var(--cyan)' : STATUS_META[f.key]?.color ?? 'var(--cyan)'}` : '1px solid var(--border)',
              background: filter === f.key ? (f.key === 'all' ? 'var(--cyan-dim)' : `${STATUS_META[f.key]?.color ?? 'var(--cyan)'}22`) : 'var(--bg-card)',
              color: filter === f.key ? (f.key === 'all' ? 'var(--cyan)' : STATUS_META[f.key]?.color ?? 'var(--cyan)') : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {f.key !== 'all' && (
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: STATUS_META[f.key]?.color, marginRight: 6, boxShadow: `0 0 5px ${STATUS_META[f.key]?.color}` }} />
            )}
            {f.label}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              ({f.key === 'all' ? complaints.length : complaints.filter((c) => c.status === f.key).length})
            </span>
          </button>
        ))}
      </div>

      <MapView complaints={filtered} highlightCoords={highlightCoords} />
    </div>
  )
}

export default MapPage
