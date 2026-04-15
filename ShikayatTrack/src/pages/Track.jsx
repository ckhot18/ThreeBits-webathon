import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { STATUS_META, formatCategory, formatDateTime, normalizeComplaintNumber } from '../lib/complaintUtils.js'

function Track() {
  const { getComplaintByNumber } = useComplaints()
  const [params, setParams] = useSearchParams()
  const [complaintInput, setComplaintInput] = useState(params.get('complaint') ?? '')

  const complaint = useMemo(
    () => getComplaintByNumber(params.get('complaint') ?? ''),
    [getComplaintByNumber, params],
  )

  function handleSubmit(event) {
    event.preventDefault()
    const normalized = normalizeComplaintNumber(complaintInput)

    if (!normalized) return

    setParams({ complaint: normalized })
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Track complaint</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Check complaint progress</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Enter the complaint number to view its current status, full details, and proof image once resolved.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-[1fr,auto]">
          <input
            type="text"
            value={complaintInput}
            onChange={(event) => setComplaintInput(event.target.value)}
            placeholder="Enter complaint number"
            className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Fetch complaint
          </button>
        </form>
      </section>

      {!params.get('complaint') ? (
        <section className="rounded-[32px] border border-dashed border-stone-300 bg-stone-50 p-8 text-slate-500">
          Enter a complaint number to view the complaint details.
        </section>
      ) : null}

      {params.get('complaint') && !complaint ? (
        <section className="rounded-[32px] bg-rose-50 p-8 text-rose-700 shadow-sm">
          No complaint was found for <strong>{params.get('complaint')}</strong>.
        </section>
      ) : null}

      {complaint ? (
        <section className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-6 rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {complaint.complaintNumber}
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900">{complaint.title}</h2>
              </div>
              <span
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-900"
                style={{ backgroundColor: STATUS_META[complaint.status].color }}
              >
                {STATUS_META[complaint.status].label}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
                <p className="mt-2 text-base font-medium text-slate-900">
                  {formatCategory(complaint.category, complaint.otherCategory)}
                </p>
              </div>
              <div className="rounded-3xl bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reported on</p>
                <p className="mt-2 text-base font-medium text-slate-900">{formatDateTime(complaint.createdAt)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Description</p>
              <p className="mt-3 text-base leading-7 text-slate-700">{complaint.description}</p>
            </div>

            {complaint.imageUrl ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen image</p>
                <img
                  src={complaint.imageUrl}
                  alt={complaint.title}
                  className="mt-3 h-72 w-full rounded-[28px] object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Status timeline</p>
              <div className="mt-5 space-y-4">
                {complaint.timeline.map((entry) => (
                  <article key={`${entry.status}-${entry.timestamp}`} className="flex gap-4 rounded-3xl bg-stone-50 p-4">
                    <span className="mt-2 h-3 w-3 flex-none rounded-full" style={{ backgroundColor: STATUS_META[entry.status].color }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{STATUS_META[entry.status].label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{entry.note}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(entry.timestamp)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resolution details</p>
              {complaint.status === 'resolved' ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-800">
                    <p className="text-sm font-medium">Resolved remarks</p>
                    <p className="mt-2 text-sm leading-6">{complaint.remarks || 'No remarks added.'}</p>
                  </div>
                  <div className="rounded-3xl bg-stone-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Description</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {complaint.resolutionDescription || 'No additional resolution description provided.'}
                    </p>
                  </div>
                  {complaint.proofImageUrl ? (
                    <img
                      src={complaint.proofImageUrl}
                      alt="Resolution proof"
                      className="h-72 w-full rounded-[28px] object-cover"
                    />
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Resolution proof and remarks will appear here after the complaint is marked as solved by the admin.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default Track
