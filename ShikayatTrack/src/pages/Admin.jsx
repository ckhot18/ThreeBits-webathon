import { useMemo, useState } from 'react'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime, readFileAsDataUrl } from '../lib/complaintUtils.js'

const FILTERS = [
  { key: 'total', label: 'Total complaints raised' },
  { key: 'underProcess', label: 'Under solving process' },
  { key: 'notSeen', label: 'Not seen yet' },
  { key: 'resolved', label: 'Resolved complaints' },
]

function filterComplaints(key, complaints) {
  if (key === 'underProcess') {
    return complaints.filter((item) => item.status === 'assigned' || item.status === 'in_progress')
  }

  if (key === 'notSeen') {
    return complaints.filter((item) => item.status === 'reported')
  }

  if (key === 'resolved') {
    return complaints.filter((item) => item.status === 'resolved')
  }

  return complaints
}

function ComplaintActionForm({ complaint, onSave }) {
  const [status, setStatus] = useState(
    complaint.status === 'resolved' ? 'in_progress' : complaint.status,
  )
  const [remarks, setRemarks] = useState(complaint.remarks || '')
  const [resolutionDescription, setResolutionDescription] = useState(
    complaint.resolutionDescription || '',
  )
  const [markResolved, setMarkResolved] = useState(complaint.status === 'resolved')
  const [proofFile, setProofFile] = useState(null)
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const proofImageUrl = proofFile ? await readFileAsDataUrl(proofFile) : complaint.proofImageUrl

    onSave(complaint.id, {
      status,
      remarks,
      resolutionDescription,
      markResolved,
      proofImageUrl,
    })

    setFeedback('Complaint updated successfully.')
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Update complaint</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">Admin action form</h3>
        </div>
        {feedback ? <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{feedback}</span> : null}
      </div>

      <div className="mt-6 space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={markResolved}
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900 disabled:bg-stone-100"
          >
            <option value="reported">Reported</option>
            <option value="assigned">Assigned to official</option>
            <option value="in_progress">In progress</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-4 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={markResolved}
            onChange={(event) => setMarkResolved(event.target.checked)}
            className="h-4 w-4"
          />
          Mark as solved
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Remarks</span>
          <textarea
            rows="3"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Add remarks for this complaint"
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Description if required</span>
          <textarea
            rows="4"
            value={resolutionDescription}
            onChange={(event) => setResolutionDescription(event.target.value)}
            placeholder="Optional extra details about the work completed or in progress"
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Upload proof image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-slate-500"
          />
        </label>

        <button
          type="submit"
          className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Save update
        </button>
      </div>
    </form>
  )
}

function Admin() {
  const { complaints, stats, updateComplaint } = useComplaints()
  const [activeFilter, setActiveFilter] = useState('total')
  const [selectedComplaintId, setSelectedComplaintId] = useState(complaints[0]?.id ?? '')

  const filteredComplaints = useMemo(
    () => filterComplaints(activeFilter, complaints),
    [activeFilter, complaints],
  )

  const selectedComplaint = useMemo(() => {
    return complaints.find((item) => item.id === selectedComplaintId) ?? filteredComplaints[0] ?? null
  }, [complaints, filteredComplaints, selectedComplaintId])

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-slate-900 px-6 py-8 text-white shadow-xl sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Admin route</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Complaint operations dashboard</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
          Review incoming complaints, drill into complaint titles, and update them with remarks, resolution details, and proof images.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { key: 'total', label: 'Total complaints raised', value: stats.total },
          { key: 'underProcess', label: 'Under solving process', value: stats.underProcess },
          { key: 'notSeen', label: 'Not seen yet', value: stats.notSeen },
          { key: 'resolved', label: 'Resolved complaints', value: stats.resolved },
        ].map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setActiveFilter(card.key)}
            className={[
              'rounded-[28px] border p-5 text-left shadow-sm transition',
              activeFilter === card.key
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-stone-200 bg-white text-slate-900 hover:border-stone-300',
            ].join(' ')}
          >
            <p className="text-sm opacity-80">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold">{card.value}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.72fr,1.28fr]">
        <div className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Complaint titles</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {FILTERS.find((filter) => filter.key === activeFilter)?.label}
              </h2>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-2 text-sm font-medium text-slate-600">
              {filteredComplaints.length} items
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {filteredComplaints.length ? (
              filteredComplaints.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  onClick={() => setSelectedComplaintId(complaint.id)}
                  className={[
                    'w-full rounded-3xl border p-4 text-left transition',
                    selectedComplaint?.id === complaint.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-stone-200 bg-stone-50 text-slate-900 hover:border-stone-300',
                  ].join(' ')}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                    {complaint.complaintNumber}
                  </p>
                  <p className="mt-2 text-base font-semibold">{complaint.title}</p>
                </button>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-slate-500">
                No complaints in this group right now.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedComplaint ? (
            <div className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {selectedComplaint.complaintNumber}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900">{selectedComplaint.title}</h2>
                </div>
                <span
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-900"
                  style={{ backgroundColor: STATUS_META[selectedComplaint.status].color }}
                >
                  {STATUS_META[selectedComplaint.status].label}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {formatCategory(selectedComplaint.category, selectedComplaint.otherCategory)}
                  </p>
                </div>
                <div className="rounded-3xl bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reported on</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {formatDateTime(selectedComplaint.createdAt)}
                  </p>
                </div>
              </div>

              <p className="mt-6 text-base leading-7 text-slate-700">{selectedComplaint.description}</p>

              {selectedComplaint.imageUrl ? (
                <img
                  src={selectedComplaint.imageUrl}
                  alt={selectedComplaint.title}
                  className="mt-6 h-72 w-full rounded-[28px] object-cover"
                />
              ) : null}
            </div>
          ) : null}

          {selectedComplaint ? (
            <ComplaintActionForm
              key={selectedComplaint.id}
              complaint={selectedComplaint}
              onSave={updateComplaint}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default Admin
