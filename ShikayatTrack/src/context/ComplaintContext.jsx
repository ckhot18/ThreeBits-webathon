/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy,
} from 'firebase/firestore'
import { normalizeComplaintNumber } from '../lib/complaintUtils.js'
import { assignAgent } from '../lib/agents.js'
import { getDb } from '../lib/firebase.js'

const ComplaintContext = createContext(null)
const STORAGE_KEY = 'smartcity-complaints-v2'
const MAP_CENTER = { lat: 18.5204, lng: 73.8567 }

function createSeedComplaint({ suffix, title, category, status, createdAt, locationName, offset, remarks = '', resolutionDescription = '' }) {
  const complaintNumber = `SKT-2026-${suffix}`
  const agent = status !== 'reported' ? assignAgent(category) : null
  const timeline = [
    { status: 'reported', note: 'Complaint registered by citizen.', timestamp: createdAt },
  ]
  if (status === 'assigned' || status === 'in_progress' || status === 'resolved') {
    timeline.push({ status: 'assigned', note: agent ? `Assigned to ${agent.name}.` : 'Assigned.', timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 45).toISOString() })
  }
  if (status === 'in_progress' || status === 'resolved') {
    timeline.push({ status: 'in_progress', note: 'Work started on site.', timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 150).toISOString() })
  }
  if (status === 'resolved') {
    timeline.push({ status: 'resolved', note: remarks || 'Issue resolved.', timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 360).toISOString() })
  }
  return {
    id: complaintNumber, complaintNumber, title, category, otherCategory: '', reporterName: '',
    imageUrl: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=900&q=80',
    status, createdAt, updatedAt: timeline[timeline.length - 1].timestamp, locationName,
    coordinates: { lat: MAP_CENTER.lat + offset[0], lng: MAP_CENTER.lng + offset[1] },
    remarks, resolutionDescription,
    proofImageUrl: status === 'resolved' ? 'https://images.unsplash.com/photo-1581092918484-8313b3f2b2a3?auto=format&fit=crop&w=900&q=80' : '',
    timeline, assignedAgent: agent ?? null, aiSummary: '', aiSeverity: '',
  }
}

const SEED_COMPLAINTS = [
  createSeedComplaint({ suffix: '1041', title: 'Overflowing sewage near market lane', category: 'sewage', status: 'reported', createdAt: '2026-04-14T08:20:00.000Z', locationName: 'Bhavani Market Ward', offset: [0.011, -0.013] }),
  createSeedComplaint({ suffix: '1042', title: 'Water leakage from main pipeline', category: 'water', status: 'assigned', createdAt: '2026-04-14T05:40:00.000Z', locationName: 'Shivaji Nagar', offset: [-0.008, 0.016] }),
  createSeedComplaint({ suffix: '1043', title: 'Large pothole on service road', category: 'road', status: 'in_progress', createdAt: '2026-04-13T10:10:00.000Z', locationName: 'University Circle', offset: [0.006, 0.008], remarks: 'Repair crew dispatched.' }),
  createSeedComplaint({ suffix: '1044', title: 'Broken footpath slab near bus stop', category: 'footpath', status: 'resolved', createdAt: '2026-04-12T12:05:00.000Z', locationName: 'Riverside Bus Stop', offset: [-0.012, -0.01], remarks: 'Slab reset.', resolutionDescription: 'Repair completed.' }),
  createSeedComplaint({ suffix: '1045', title: 'Street light not working for 3 days', category: 'streetlight', status: 'assigned', createdAt: '2026-04-13T18:00:00.000Z', locationName: 'Aundh Main Road', offset: [0.003, -0.007] }),
  createSeedComplaint({ suffix: '1046', title: 'Garbage pile near residential colony', category: 'garbage', status: 'reported', createdAt: '2026-04-14T07:00:00.000Z', locationName: 'Kothrud Colony', offset: [-0.005, 0.012] }),
]

function loadLocalComplaints() {
  if (typeof window === 'undefined') return SEED_COMPLAINTS
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return SEED_COMPLAINTS
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_COMPLAINTS
  } catch { return SEED_COMPLAINTS }
}

function generateComplaintNumber() {
  const now = new Date()
  const day = `${now.getDate()}`.padStart(2, '0')
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  return `SKT-${now.getFullYear()}${month}${day}-${Math.floor(1000 + Math.random() * 9000)}`
}

function generateCoordinates(size) {
  const spread = 0.015 + size * 0.0005
  return {
    lat: MAP_CENTER.lat + (Math.random() - 0.5) * spread,
    lng: MAP_CENTER.lng + (Math.random() - 0.5) * spread,
  }
}

export function ComplaintProvider({ children }) {
  const db = getDb()
  const [complaints, setComplaints] = useState(loadLocalComplaints)
  const hasAttemptedSeedRef = useRef(false)

  // Sync with Firestore if available
  useEffect(() => {
    if (!db) return
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty && !hasAttemptedSeedRef.current) {
        hasAttemptedSeedRef.current = true
        try {
          await Promise.all(
            SEED_COMPLAINTS.map((c) => {
              const { imageUrl, proofImageUrl, ...rest } = c
              return addDoc(collection(db, 'complaints'), {
                ...rest,
                imageUrl: imageUrl?.startsWith('data:') ? '' : (imageUrl ?? ''),
                proofImageUrl: proofImageUrl?.startsWith('data:') ? '' : (proofImageUrl ?? ''),
                _id: c.id,
              })
            }),
          )
        } catch (seedErr) {
          console.error('Firestore seed failed:', seedErr)
        }
        return
      }
      const docs = snap.docs.map((d) => {
        const data = d.data()
        return { ...data, id: data._id || d.id, _docId: d.id }
      })

      // Merge Firestore docs with local media so base64 previews remain visible.
      setComplaints((prev) => {
        if (!docs.length) return prev
        return docs.map((fsDoc) => {
          const local = prev.find((p) => p.id === fsDoc.id)
          return {
            ...fsDoc,
            imageUrl: fsDoc.imageUrl || local?.imageUrl || '',
            proofImageUrl: fsDoc.proofImageUrl || local?.proofImageUrl || '',
          }
        })
      })
    }, (err) => {
      console.error('Firestore snapshot error:', err)
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db])

  // Persist to localStorage as fallback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints))
    }
  }, [complaints])

  const stats = useMemo(() => ({
    total: complaints.length,
    underProcess: complaints.filter((c) => c.status === 'assigned' || c.status === 'in_progress').length,
    notSeen: complaints.filter((c) => c.status === 'reported').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  }), [complaints])

  async function createComplaint({
    title,
    category,
    otherCategory,
    imageUrl,
    aiSummary = '',
    aiSeverity = '',
    detectedCategory = '',
    reporterName = '',
    coordinates = null,
    locationName = 'Citizen report zone',
  }) {
    const timestamp = new Date().toISOString()
    const complaintNumber = generateComplaintNumber()
    const effectiveCategory = detectedCategory || category
    const agent = assignAgent(effectiveCategory)
    const hasValidCoords = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)
    const coords = hasValidCoords ? coordinates : generateCoordinates(complaints.length + 1)

    const complaint = {
      id: complaintNumber, complaintNumber,
      title: title.trim(), category: effectiveCategory,
      otherCategory: otherCategory?.trim() ?? '',
      reporterName: reporterName?.trim() ?? '',
      imageUrl, status: 'assigned',
      createdAt: timestamp, updatedAt: timestamp,
      locationName: locationName?.trim() || 'Citizen report zone',
      coordinates: coords,
      remarks: '', resolutionDescription: '', proofImageUrl: '',
      assignedAgent: agent, aiSummary, aiSeverity,
      timeline: [
        { status: 'reported', note: 'Complaint submitted by citizen.', timestamp },
        { status: 'assigned', note: `AI analysis complete. Assigned to ${agent.name} (${agent.role}).`, timestamp: new Date(Date.now() + 2000).toISOString() },
      ],
    }

    // Always update local state immediately so UI shows the result right away
    setComplaints((cur) => [complaint, ...cur])

    if (db) {
      try {
        // Strip base64 imageUrl — too large for Firestore (1MB doc limit).
        // Store a placeholder; in production you'd upload to Firebase Storage first.
        const { imageUrl: _img, proofImageUrl: _proof, ...firestoreData } = complaint
        const ref = await addDoc(collection(db, 'complaints'), {
          ...firestoreData,
          imageUrl: imageUrl?.startsWith('data:') ? '' : (imageUrl ?? ''),
          proofImageUrl: '',
          _id: complaintNumber,
        })
        setComplaints((cur) => cur.map((c) => (c.id === complaintNumber ? { ...c, _docId: ref.id } : c)))
      } catch (err) {
        console.error('Firestore write failed:', err)
        // Local state already updated, so the UI still works
      }
    } else {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([complaint, ...complaints]))
      }
    }

    return complaint
  }

  async function updateComplaint(id, updates) {
    const item = complaints.find((c) => c.id === id)
    if (!item) return null

    const timestamp = new Date().toISOString()
    const nextStatus = updates.markResolved ? 'resolved' : updates.status || item.status
    const timeline = [...item.timeline]

    if (nextStatus !== item.status) {
      timeline.push({
        status: nextStatus,
        note: nextStatus === 'resolved'
          ? updates.remarks?.trim() || 'Complaint marked resolved by admin.'
          : `Status updated to ${nextStatus.replace('_', ' ')}.`,
        timestamp,
      })
    }

    const updated = {
      ...item, status: nextStatus, updatedAt: timestamp,
      remarks: updates.remarks?.trim() || '',
      resolutionDescription: updates.resolutionDescription?.trim() || '',
      proofImageUrl: updates.proofImageUrl || item.proofImageUrl || '',
      assignedAgent: updates.assignedAgent !== undefined ? updates.assignedAgent : item.assignedAgent,
      timeline,
    }

    // Always update local state immediately
    setComplaints((cur) => cur.map((c) => c.id === id ? updated : c))

    if (db && item._docId) {
      try {
        const { _docId, imageUrl, ...dataToSave } = updated
        // Strip base64 proof image too if present
        const proofUrl = dataToSave.proofImageUrl?.startsWith('data:') ? '' : (dataToSave.proofImageUrl ?? '')
        await updateDoc(doc(db, 'complaints', item._docId), { ...dataToSave, proofImageUrl: proofUrl })
      } catch (err) {
        console.error('Firestore update failed:', err)
      }
    }

    return updated
  }

  function getComplaintByNumber(complaintNumber) {
    const normalized = normalizeComplaintNumber(complaintNumber)
    return complaints.find((c) => normalizeComplaintNumber(c.complaintNumber) === normalized) ?? null
  }

  const value = {
    complaints: [...complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    stats, createComplaint, updateComplaint, getComplaintByNumber,
  }

  return <ComplaintContext.Provider value={value}>{children}</ComplaintContext.Provider>
}

export function useComplaints() {
  const ctx = useContext(ComplaintContext)
  if (!ctx) throw new Error('useComplaints must be used within ComplaintProvider')
  return ctx
}
