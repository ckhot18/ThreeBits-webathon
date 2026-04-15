import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime } from '../lib/complaintUtils.js'

const DEFAULT_CENTER = [18.5204, 73.8567]
const DEFAULT_ZOOM = 12

function createStatusIcon(status) {
  const color = STATUS_META[status]?.color ?? '#38bdf8'
  return L.divIcon({
    className: 'map-pin',
    html: `<span class="map-pin__dot" style="background:${color};color:${color}"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })
}

const highlightIcon = L.divIcon({
  className: 'map-pin',
  html: `<span style="display:block;width:22px;height:22px;border-radius:50%;background:#ffc107;box-shadow:0 0 0 4px rgba(255,193,7,0.32),0 0 14px #ffc107;border:2px solid #fff"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
})

const userLocationIcon = L.divIcon({
  className: '',
  html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#004d40;box-shadow:0 0 0 4px rgba(0,77,64,0.25),0 0 10px #004d40;border:2px solid #fff"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const statusIcons = {
  reported: createStatusIcon('reported'),
  assigned: createStatusIcon('assigned'),
  in_progress: createStatusIcon('in_progress'),
  resolved: createStatusIcon('resolved'),
}

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 14); return }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40], animate: true })
  }, [map, points])
  return null
}

function SetView({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom ?? DEFAULT_ZOOM, { animate: true })
  }, [map, center, zoom])
  return null
}

function MapView({ complaints: suppliedComplaints, heightClass = '', highlightCoords = null }) {
  const { complaints: allComplaints } = useComplaints()
  const complaints = suppliedComplaints ?? allComplaints

  const [userLocation, setUserLocation] = useState(null)
  const [initialCenter, setInitialCenter] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude]
        setUserLocation(loc)
        // Only set initial center if no complaints to fit
        setInitialCenter(loc)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    )
  }, [])

  const points = useMemo(
    () => complaints
      .map((item) => ({ lat: item.coordinates?.lat, lng: item.coordinates?.lng }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [complaints],
  )

  // If we have a highlight coord, center on it
  const centerOnHighlight = highlightCoords ? [highlightCoords.lat, highlightCoords.lng] : null

  return (
    <div className="map-shell">
      <div
        style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}
        className={`map-frame ${heightClass}`.trim()}
      >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" style="color:#4a6a8a">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Set view to user location on load if no complaints */}
        {initialCenter && !points.length && !centerOnHighlight && (
          <SetView center={initialCenter} zoom={14} />
        )}

        {/* Fit to highlighted coord */}
        {centerOnHighlight && <SetView center={centerOnHighlight} zoom={16} />}

        {/* Fit to all complaint points */}
        {points.length > 0 && !centerOnHighlight && <FitBounds points={points} />}

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup maxWidth={200}>
              <div style={{ color: '#0f2a24', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                <strong style={{ color: '#004d40' }}>📍 Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Highlighted location (from image GPS) */}
        {highlightCoords && (
          <>
            <Marker position={[highlightCoords.lat, highlightCoords.lng]} icon={highlightIcon}>
              <Popup maxWidth={220}>
                <div style={{ color: '#0f2a24', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                  <strong style={{ color: '#8a6a00' }}>📍 Photo Location</strong>
                  <div style={{ marginTop: 4, color: '#68827b', fontSize: 11 }}>
                    {highlightCoords.lat.toFixed(6)}, {highlightCoords.lng.toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[highlightCoords.lat, highlightCoords.lng]}
              radius={80}
              pathOptions={{ color: '#ffc107', fillColor: '#ffc107', fillOpacity: 0.18, weight: 2 }}
            />
          </>
        )}

        {/* Complaint markers */}
        {complaints.map((complaint) => {
          if (!Number.isFinite(complaint.coordinates?.lat) || !Number.isFinite(complaint.coordinates?.lng)) return null
          return (
            <Marker
              key={complaint.id}
              position={[complaint.coordinates.lat, complaint.coordinates.lng]}
              icon={statusIcons[complaint.status] ?? statusIcons.reported}
            >
              <Popup maxWidth={300}>
                <div style={{ color: '#0f2a24', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#004d40', marginBottom: 4 }}>
                    {complaint.complaintNumber}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2a24', marginBottom: 8 }}>{complaint.title}</div>

                  {complaint.imageUrl && (
                    <img src={complaint.imageUrl} alt={complaint.title} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, marginBottom: 8, display: 'block' }} />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#68827b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{formatCategory(complaint.category, complaint.otherCategory)}</span>
                      <span style={{ color: STATUS_META[complaint.status]?.color, fontWeight: 700 }}>{STATUS_META[complaint.status]?.label}</span>
                    </div>
                    <div>{formatDateTime(complaint.createdAt)}</div>
                    {complaint.reporterName && <div>👤 {complaint.reporterName}</div>}
                    {complaint.assignedAgent && (
                      <div style={{ marginTop: 4, padding: '6px 8px', background: 'rgba(185,246,202,0.38)', borderRadius: 8, color: '#004d40', fontWeight: 600 }}>
                        👷 {complaint.assignedAgent.name}
                      </div>
                    )}
                  </div>

                  {complaint.status === 'resolved' && complaint.proofImageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34d399', marginBottom: 4 }}>Resolved</div>
                      <img src={complaint.proofImageUrl} alt="Proof" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      </div>
    </div>
  )
}

export default MapView
