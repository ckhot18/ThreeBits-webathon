export const STATUS_META = {
  reported: {
    label: 'Reported',
    shortLabel: 'Reported',
    color: '#22c55e',
  },
  assigned: {
    label: 'Assigned to Official',
    shortLabel: 'Assigned',
    color: '#facc15',
  },
  in_progress: {
    label: 'In Progress',
    shortLabel: 'In Progress',
    color: '#60a5fa',
  },
  resolved: {
    label: 'Resolved',
    shortLabel: 'Resolved',
    color: '#e5e7eb',
  },
}

export const CATEGORY_OPTIONS = [
  { value: 'sewage', label: 'Sewage' },
  { value: 'water', label: 'Water' },
  { value: 'road', label: 'Road' },
  { value: 'other', label: 'Other (mention)' },
]

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatCategory(category, otherCategory = '') {
  if (category !== 'other') {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  return otherCategory ? `Other: ${otherCategory}` : 'Other'
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

export function normalizeComplaintNumber(value) {
  return String(value ?? '').trim().toUpperCase()
}
