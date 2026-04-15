/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { normalizeComplaintNumber } from '../lib/complaintUtils.js'

const ComplaintContext = createContext(null)
const STORAGE_KEY = 'shikayat-track-complaints'
const MAP_CENTER = { lat: 18.5204, lng: 73.8567 }

function createSeedComplaint({
  suffix,
  title,
  description,
  category,
  status,
  createdAt,
  locationName,
  offset,
  remarks = '',
  resolutionDescription = '',
}) {
  const complaintNumber = `SKT-2026-${suffix}`
  const timeline = [
    {
      status: 'reported',
      note: 'Complaint registered by citizen.',
      timestamp: createdAt,
    },
  ]

  if (status === 'assigned' || status === 'in_progress' || status === 'resolved') {
    timeline.push({
      status: 'assigned',
      note: 'Assigned to the concerned official.',
      timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 45).toISOString(),
    })
  }

  if (status === 'in_progress' || status === 'resolved') {
    timeline.push({
      status: 'in_progress',
      note: 'Work started on site.',
      timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 150).toISOString(),
    })
  }

  if (status === 'resolved') {
    timeline.push({
      status: 'resolved',
      note: remarks || 'Issue resolved and documented.',
      timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 360).toISOString(),
    })
  }

  return {
    id: complaintNumber,
    complaintNumber,
    title,
    description,
    category,
    otherCategory: '',
    imageUrl:
      'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=900&q=80',
    status,
    createdAt,
    updatedAt: timeline[timeline.length - 1].timestamp,
    locationName,
    coordinates: {
      lat: MAP_CENTER.lat + offset[0],
      lng: MAP_CENTER.lng + offset[1],
    },
    remarks,
    resolutionDescription,
    proofImageUrl:
      status === 'resolved'
        ? 'https://images.unsplash.com/photo-1581092918484-8313b3f2b2a3?auto=format&fit=crop&w=900&q=80'
        : '',
    timeline,
  }
}

const SEED_COMPLAINTS = [
  createSeedComplaint({
    suffix: '1041',
    title: 'Overflowing sewage near market lane',
    description: 'Drain water is overflowing near the vegetable market and causing a foul smell.',
    category: 'sewage',
    status: 'reported',
    createdAt: '2026-04-14T08:20:00.000Z',
    locationName: 'Bhavani Market Ward',
    offset: [0.011, -0.013],
  }),
  createSeedComplaint({
    suffix: '1042',
    title: 'Water leakage from main pipeline',
    description: 'A steady water leak has been wasting water since morning near the school gate.',
    category: 'water',
    status: 'assigned',
    createdAt: '2026-04-14T05:40:00.000Z',
    locationName: 'Shivaji Nagar',
    offset: [-0.008, 0.016],
  }),
  createSeedComplaint({
    suffix: '1043',
    title: 'Large pothole on service road',
    description: 'The pothole is deep enough to damage two-wheelers during evening traffic.',
    category: 'road',
    status: 'in_progress',
    createdAt: '2026-04-13T10:10:00.000Z',
    locationName: 'University Circle',
    offset: [0.006, 0.008],
    remarks: 'Repair crew dispatched with patching material.',
  }),
  createSeedComplaint({
    suffix: '1044',
    title: 'Broken footpath slab near bus stop',
    description: 'Pedestrians are tripping because the slab is lifted and cracked.',
    category: 'road',
    status: 'resolved',
    createdAt: '2026-04-12T12:05:00.000Z',
    locationName: 'Riverside Bus Stop',
    offset: [-0.012, -0.01],
    remarks: 'Slab reset and safety barricade removed after inspection.',
    resolutionDescription: 'Repair completed and inspected by ward engineer.',
  }),
]

function loadInitialComplaints() {
  if (typeof window === 'undefined') return SEED_COMPLAINTS

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return SEED_COMPLAINTS

  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_COMPLAINTS
  } catch {
    return SEED_COMPLAINTS
  }
}

function generateComplaintNumber() {
  const now = new Date()
  const day = `${now.getDate()}`.padStart(2, '0')
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const random = `${Math.floor(1000 + Math.random() * 9000)}`
  return `SKT-${now.getFullYear()}${month}${day}-${random}`
}

function generateCoordinates(size) {
  const spread = 0.015 + size * 0.0005
  return {
    lat: MAP_CENTER.lat + (Math.random() - 0.5) * spread,
    lng: MAP_CENTER.lng + (Math.random() - 0.5) * spread,
  }
}

export function ComplaintProvider({ children }) {
  const [complaints, setComplaints] = useState(loadInitialComplaints)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints))
  }, [complaints])

  const stats = useMemo(() => {
    const underProcess = complaints.filter(
      (item) => item.status === 'assigned' || item.status === 'in_progress',
    ).length

    return {
      total: complaints.length,
      underProcess,
      notSeen: complaints.filter((item) => item.status === 'reported').length,
      resolved: complaints.filter((item) => item.status === 'resolved').length,
    }
  }, [complaints])

  function createComplaint({ title, description, category, otherCategory, imageUrl }) {
    const timestamp = new Date().toISOString()
    const complaintNumber = generateComplaintNumber()

    const complaint = {
      id: complaintNumber,
      complaintNumber,
      title: title.trim(),
      description: description.trim(),
      category,
      otherCategory: otherCategory.trim(),
      imageUrl,
      status: 'reported',
      createdAt: timestamp,
      updatedAt: timestamp,
      locationName: 'Citizen report zone',
      coordinates: generateCoordinates(complaints.length + 1),
      remarks: '',
      resolutionDescription: '',
      proofImageUrl: '',
      timeline: [
        {
          status: 'reported',
          note: 'Complaint submitted successfully.',
          timestamp,
        },
      ],
    }

    setComplaints((current) => [complaint, ...current])
    return complaint
  }

  function updateComplaint(id, updates) {
    let updatedComplaint = null

    setComplaints((current) =>
      current.map((item) => {
        if (item.id !== id) return item

        const timestamp = new Date().toISOString()
        const nextStatus = updates.markResolved ? 'resolved' : updates.status || item.status
        const timeline = [...item.timeline]

        if (nextStatus !== item.status) {
          const note =
            nextStatus === 'resolved'
              ? updates.remarks?.trim() || 'Complaint marked resolved by admin.'
              : `Status updated to ${nextStatus.replace('_', ' ')}.`

          timeline.push({
            status: nextStatus,
            note,
            timestamp,
          })
        }

        updatedComplaint = {
          ...item,
          status: nextStatus,
          updatedAt: timestamp,
          remarks: updates.remarks?.trim() || '',
          resolutionDescription: updates.resolutionDescription?.trim() || '',
          proofImageUrl: updates.proofImageUrl || item.proofImageUrl || '',
          timeline,
        }

        return updatedComplaint
      }),
    )

    return updatedComplaint
  }

  function getComplaintByNumber(complaintNumber) {
    const normalized = normalizeComplaintNumber(complaintNumber)
    return complaints.find((item) => normalizeComplaintNumber(item.complaintNumber) === normalized) ?? null
  }

  const value = {
    complaints: [...complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    stats,
    createComplaint,
    updateComplaint,
    getComplaintByNumber,
  }

  return <ComplaintContext.Provider value={value}>{children}</ComplaintContext.Provider>
}

export function useComplaints() {
  const context = useContext(ComplaintContext)

  if (!context) {
    throw new Error('useComplaints must be used within ComplaintProvider')
  }

  return context
}
