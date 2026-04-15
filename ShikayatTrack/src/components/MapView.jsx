import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime } from '../lib/complaintUtils.js'

const DEFAULT_CENTER = [18.5204, 73.8567]
const DEFAULT_ZOOM = 11

function createStatusIcon(status) {
  const color = STATUS_META[status]?.color ?? '#22c55e'

  return L.divIcon({
    className: 'map-pin',
    html: `<span class="map-pin__dot" style="background:${color}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

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

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14)
      return
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]))
    map.fitBounds(bounds, { padding: [32, 32] })
  }, [map, points])

  return null
}

function MapView({ complaints: suppliedComplaints, heightClass = 'h-[480px]' }) {
  const { complaints: allComplaints } = useComplaints()
  const complaints = suppliedComplaints ?? allComplaints

  const points = useMemo(
    () => complaints.map((item) => ({ lat: item.coordinates.lat, lng: item.coordinates.lng })),
    [complaints],
  )

  return (
    <div className={`overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm ${heightClass}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 0 && <FitBounds points={points} />}
        {complaints.map((complaint) => (
          <Marker
            key={complaint.id}
            position={[complaint.coordinates.lat, complaint.coordinates.lng]}
            icon={statusIcons[complaint.status]}
          >
            <Popup className="map-popup" maxWidth={300}>
              <div className="space-y-3 text-slate-800">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {complaint.complaintNumber}
                  </p>
                  <h3 className="m-0 text-base font-semibold text-slate-900">{complaint.title}</h3>
                </div>

                {complaint.imageUrl ? (
                  <img
                    src={complaint.imageUrl}
                    alt={complaint.title}
                    className="h-32 w-full rounded-xl object-cover"
                  />
                ) : null}

                <div className="space-y-1 text-sm text-slate-600">
                  <p className="m-0">{complaint.description}</p>
                  <p className="m-0 font-medium text-slate-700">
                    {formatCategory(complaint.category, complaint.otherCategory)}
                  </p>
                  <p className="m-0">{STATUS_META[complaint.status].label}</p>
                  <p className="m-0">Reported: {formatDateTime(complaint.createdAt)}</p>
                </div>

                {complaint.status === 'resolved' && complaint.proofImageUrl ? (
                  <div className="rounded-xl bg-stone-50 p-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Resolution proof
                    </p>
                    <img
                      src={complaint.proofImageUrl}
                      alt="Resolution proof"
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default MapView
