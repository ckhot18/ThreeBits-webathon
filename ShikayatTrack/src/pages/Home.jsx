import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MapView from '../components/MapView.jsx'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime, normalizeComplaintNumber } from '../lib/complaintUtils.js'
import { downloadComplaintReportPdf } from '../lib/reportPdf.js'

function ComplaintReportModal({ complaint, onClose }) {
  const [downloadError, setDownloadError] = useState('')

  function handleDownload() {
    setDownloadError('')

    try {
      downloadComplaintReportPdf(complaint)
    } catch (error) {
      setDownloadError(error.message || 'Could not generate PDF report.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-6" role="dialog" aria-modal="true">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{complaint.complaintNumber}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">{complaint.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{STATUS_META[complaint.status].label}</p>
          </article>
          <article className="rounded-2xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {formatCategory(complaint.category, complaint.otherCategory)}
            </p>
          </article>
          <article className="rounded-2xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reported on</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{formatDateTime(complaint.createdAt)}</p>
          </article>
          <article className="rounded-2xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Location</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{complaint.locationName}</p>
          </article>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Description</p>
          <p className="mt-2 text-sm leading-7 text-slate-700 sm:text-base">{complaint.description}</p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</p>
          <div className="mt-3 space-y-3">
            {complaint.timeline.map((entry) => (
              <article key={`${entry.status}-${entry.timestamp}`} className="rounded-2xl bg-stone-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{STATUS_META[entry.status].label}</p>
                <p className="mt-1 text-sm text-slate-600">{entry.note}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(entry.timestamp)}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-5">
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Download as PDF
          </button>
          {downloadError ? <p className="text-sm text-rose-700">{downloadError}</p> : null}
        </div>
      </section>
    </div>
  )
}

function Home() {
  const { complaints, stats, getComplaintByNumber } = useComplaints()
  const [complaintNumber, setComplaintNumber] = useState('')
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState(null)

  const statusCards = useMemo(
    () => [
      { title: 'Total complaints raised', value: stats.total },
      { title: 'Under solving process', value: stats.underProcess },
      { title: 'Not seen yet', value: stats.notSeen },
      { title: 'Resolved complaints', value: stats.resolved },
    ],
    [stats],
  )

  function handleTrackSubmit(event) {
    event.preventDefault()
    setError('')

    const normalizedComplaintNumber = normalizeComplaintNumber(complaintNumber)
    if (!normalizedComplaintNumber) return

    const complaint = getComplaintByNumber(normalizedComplaintNumber)
    if (!complaint) {
      setError(`No complaint found for ${normalizedComplaintNumber}.`)
      return
    }

    setSelectedComplaint(complaint)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-8 pb-4 sm:space-y-10 sm:pb-6">
      <section className="grid gap-6 rounded-[28px] bg-slate-900 px-4 py-6 text-white shadow-xl sm:gap-8 sm:rounded-[32px] sm:px-8 sm:py-8 lg:grid-cols-[1.2fr,0.8fr] lg:px-10 lg:py-10">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-300">
              City complaint management
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              ShikayatTrack
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Report local civic issues, track complaint progress, and monitor resolutions from one simple portal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/report"
              className="rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 no-underline transition hover:bg-amber-200"
            >
              Report Issue
            </Link>
            <Link
              to="/track"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
            >
              Track Complaint
            </Link>
          </div>

          
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[28px] bg-white p-5 text-slate-900">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Today at a glance</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="text-3xl font-semibold">{stats.total}</p>
                <p className="mt-1 text-sm text-slate-500">Total complaints</p>
              </div>
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="text-3xl font-semibold">{stats.resolved}</p>
                <p className="mt-1 text-sm text-slate-500">Resolved</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Map page</p>
            <h2 className="mt-2 text-2xl font-semibold">Civic Pulse Map</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              View all complaints on a live map with status-specific pins and reported timestamps.
            </p>
            <Link
              to="/map"
              className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
            >
              Open map
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((item) => (
          <article key={item.title} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.title}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Complaints map</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Civic Pulse Map</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <span key={key} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
              ))}
            </div>
          </div>
          <MapView complaints={complaints} heightClass="h-[360px] sm:h-[460px] lg:h-[520px]" />
      </section>

      {isModalOpen && selectedComplaint ? (
        <ComplaintReportModal complaint={selectedComplaint} onClose={() => setIsModalOpen(false)} />
      ) : null}
    </div>
  )
}

export default Home
