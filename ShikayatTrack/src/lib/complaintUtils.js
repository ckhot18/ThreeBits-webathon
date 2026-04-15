export const STATUS_META = {
  reported: {
    label: 'Reported',
    shortLabel: 'Reported',
    color: '#3b82f6',
  },
  assigned: {
    label: 'Agent Assigned',
    shortLabel: 'Assigned',
    color: '#f59e0b',
  },
  in_progress: {
    label: 'In Progress',
    shortLabel: 'In Progress',
    color: '#8b5cf6',
  },
  resolved: {
    label: 'Resolved',
    shortLabel: 'Resolved',
    color: '#10b981',
  },
}

export const CATEGORY_OPTIONS = [
  { value: 'water', label: 'Water Supply / Leakage' },
  { value: 'sewage', label: 'Sewage / Drain Overflow' },
  { value: 'road', label: 'Road Damage / Pothole' },
  { value: 'footpath', label: 'Footpath / Pavement' },
  { value: 'electricity', label: 'Electricity / Power Outage' },
  { value: 'streetlight', label: 'Street Light Not Working' },
  { value: 'garbage', label: 'Garbage / Waste Disposal' },
  { value: 'sanitation', label: 'Sanitation / Cleanliness' },
  { value: 'tree', label: 'Fallen Tree / Branch' },
  { value: 'garden', label: 'Park / Garden Maintenance' },
  { value: 'stray_animals', label: 'Stray Animals' },
  { value: 'drainage', label: 'Blocked Drainage' },
  { value: 'flooding', label: 'Waterlogging / Flooding' },
  { value: 'building', label: 'Illegal Construction' },
  { value: 'encroachment', label: 'Road Encroachment' },
  { value: 'noise', label: 'Noise Pollution' },
  { value: 'other', label: 'Other (specify)' },
]

export const CATEGORY_LABEL_MAP = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
)

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatCategory(category, otherCategory = '') {
  if (category === 'other') {
    return otherCategory ? `Other: ${otherCategory}` : 'Other'
  }
  return CATEGORY_LABEL_MAP[category] ?? (category.charAt(0).toUpperCase() + category.slice(1))
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

function getResolutionTimestamp(complaint) {
  if (!Array.isArray(complaint.timeline)) return null
  const resolvedEntry = complaint.timeline.find((entry) => entry.status === 'resolved' && entry.timestamp)
  return resolvedEntry?.timestamp ?? null
}

function getReopenedCount(complaint) {
  if (!Array.isArray(complaint.timeline) || complaint.timeline.length < 2) return 0
  let reopened = 0
  for (let i = 1; i < complaint.timeline.length; i += 1) {
    const prev = complaint.timeline[i - 1]?.status
    const cur = complaint.timeline[i]?.status
    if (prev === 'resolved' && cur && cur !== 'resolved') reopened += 1
  }
  return reopened
}

function getDepartmentName(complaint) {
  return formatCategory(complaint.category, complaint.otherCategory)
}

export function buildDepartmentReputation(complaints) {
  const byDepartment = new Map()

  complaints.forEach((complaint) => {
    const department = getDepartmentName(complaint)
    if (!byDepartment.has(department)) {
      byDepartment.set(department, {
        department,
        total: 0,
        resolved: 0,
        pending: 0,
        reopened: 0,
        resolutionHours: [],
      })
    }

    const item = byDepartment.get(department)
    item.total += 1
    if (complaint.status === 'resolved') item.resolved += 1
    else item.pending += 1

    item.reopened += getReopenedCount(complaint)

    const resolvedAt = getResolutionTimestamp(complaint)
    if (resolvedAt) {
      const hours = (new Date(resolvedAt).getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60)
      if (Number.isFinite(hours) && hours >= 0) item.resolutionHours.push(hours)
    }
  })

  return [...byDepartment.values()]
    .map((item) => {
      const avgResolutionHours = item.resolutionHours.length
        ? item.resolutionHours.reduce((sum, value) => sum + value, 0) / item.resolutionHours.length
        : null
      const resolvedRate = item.total ? (item.resolved / item.total) * 100 : 0
      const reopenedRate = item.total ? (item.reopened / item.total) * 100 : 0
      const avgHoursForScore = avgResolutionHours ?? 72
      const resolutionComponent = Math.max(0, 100 - Math.min(avgHoursForScore, 120) * 0.7)
      const score = Math.round(
        (resolutionComponent * 0.4)
        + (resolvedRate * 0.45)
        + (Math.max(0, 100 - reopenedRate * 2) * 0.15),
      )

      return {
        department: item.department,
        total: item.total,
        resolved: item.resolved,
        pending: item.pending,
        reopened: item.reopened,
        avgResolutionHours,
        resolvedRate,
        score: Math.max(0, Math.min(100, score)),
      }
    })
    .sort((a, b) => b.score - a.score)
}
