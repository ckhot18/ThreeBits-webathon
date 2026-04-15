import MapView from '../components/MapView.jsx'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META } from '../lib/complaintUtils.js'

function MapPage() {
  const { complaints } = useComplaints()

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Suggested map name</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Civic Pulse Map</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          A live complaint map showing every complaint pin and its current status. Resolved complaints display proof in the popup, matching what citizens see in tracking.
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </div>
        ))}
      </section>

      <MapView complaints={complaints} heightClass="h-[620px]" />
    </div>
  )
}

export default MapPage
