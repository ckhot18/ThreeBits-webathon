import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useComplaints } from '../context/ComplaintContext.jsx'
import { CATEGORY_OPTIONS, readFileAsDataUrl } from '../lib/complaintUtils.js'

const INITIAL_FORM = {
  title: '',
  description: '',
  category: 'sewage',
  otherCategory: '',
  imageFile: null,
}

function Report() {
  const { createComplaint } = useComplaints()
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdComplaint, setCreatedComplaint] = useState(null)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.title.trim() || !form.description.trim()) {
      setError('Please fill in the title and description.')
      return
    }

    if (form.category === 'other' && !form.otherCategory.trim()) {
      setError('Please mention the category for the complaint.')
      return
    }

    setSubmitting(true)

    try {
      const imageUrl = await readFileAsDataUrl(form.imageFile)
      const complaint = createComplaint({
        title: form.title,
        description: form.description,
        category: form.category,
        otherCategory: form.otherCategory,
        imageUrl,
      })

      setCreatedComplaint(complaint)
      setForm(INITIAL_FORM)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
      <section className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Report issue</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Raise a civic complaint</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Fill in the details below to register the issue. A complaint number will be generated immediately for tracking.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="For example: Water leakage near school gate"
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              rows="5"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Describe the issue clearly so the city team can act faster."
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {form.category === 'other' ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Mention category</span>
              <input
                type="text"
                value={form.otherCategory}
                onChange={(event) => updateField('otherCategory', event.target.value)}
                placeholder="Mention the exact complaint type"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-slate-900"
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Upload image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => updateField('imageFile', event.target.files?.[0] ?? null)}
              className="w-full rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-slate-500"
            />
          </label>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit complaint'}
          </button>
        </form>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[32px] bg-slate-900 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">What happens next</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
            <p>1. Your complaint is saved with a unique complaint number.</p>
            <p>2. The same complaint appears in the admin panel and on the map.</p>
            <p>3. Once the city team resolves it, proof and remarks also become visible in tracking.</p>
          </div>
        </div>

        <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Track later</p>
          {createdComplaint ? (
            <div className="mt-3 space-y-4">
              <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-800">
                <p className="text-sm">Complaint submitted successfully.</p>
                <p className="mt-2 text-2xl font-semibold">{createdComplaint.complaintNumber}</p>
              </div>
              <Link
                to={`/track?complaint=${encodeURIComponent(createdComplaint.complaintNumber)}`}
                className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white no-underline"
              >
                Track this complaint
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Submit the form to generate a complaint number and immediately track the complaint progress.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

export default Report
