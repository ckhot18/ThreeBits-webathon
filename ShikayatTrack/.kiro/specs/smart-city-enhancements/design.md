# Design Document

## Smart City Enhancements

---

## Overview

This document describes the technical design for ten new capabilities added to the ShikayatTrack civic complaint application (React + Vite, localStorage persistence, Gemini Vision AI). The enhancements span citizen engagement (satisfaction ratings, upvotes, reopen), AI automation (auto-assign with workload awareness, photo-to-form auto-fill), analytics (charts, department reputation scores), and duplicate detection.

All features are implemented within the existing architecture: `ComplaintContext` for state, `localStorage` for persistence, `src/lib/` for pure utilities, `src/components/` for shared UI, and `src/pages/` for page-level integration. No new routing or backend is introduced. Recharts will be added as a dependency for chart rendering.

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Pages Layer                          │
│  Home  │  Report  │  Track  │  Admin  │  MapPage            │
├─────────────────────────────────────────────────────────────┤
│                     Components Layer                        │
│  StarRating │ OverdueBadge │ UpvoteButton │ ReopenModal     │
│  DepartmentScoreCard │ AnalyticsCharts │ DuplicateWarning   │
├─────────────────────────────────────────────────────────────┤
│                      Context Layer                          │
│              ComplaintContext (state + localStorage)        │
├─────────────────────────────────────────────────────────────┤
│                       Lib Layer                             │
│  agents.js │ aiAnalysis.js │ complaintUtils.js              │
│  reputationScore.js (new)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
Page Component
    │  calls context action or lib utility
    ▼
ComplaintContext  ──────────────────────────────► localStorage
    │  (state update triggers re-render)
    ▼
Derived computations (useMemo)
    │  reputation scores, analytics aggregates, overdue flags
    ▼
UI Components re-render
```

### Session Identity

Upvote deduplication requires a stable per-browser identifier. A UUID is generated once and stored in `sessionStorage` under the key `smartcity-session-id`. This is intentionally session-scoped (cleared when the browser tab closes) to prevent permanent lock-out while still preventing double-upvotes within a session.

```
getSessionId() → sessionStorage.getItem('smartcity-session-id')
              ?? (uuid = crypto.randomUUID(), sessionStorage.setItem(...), uuid)
```

---

## Components and Interfaces

### New Utility File: `src/lib/reputationScore.js`

Pure functions with no side effects. Exported and consumed by `ComplaintContext` via `useMemo`.

```js
// Haversine distance in meters between two {lat, lng} points
haversineDistance(a, b) → number

// Hours elapsed since createdAt for non-resolved complaints
hoursOpen(complaint) → number

// Whether a complaint is overdue (>= 48h and not resolved)
isOverdue(complaint) → boolean

// Compute reputation score (0–100) for a single department
computeDepartmentScore(complaints) → number

// Compute scores for all departments, grouped by primary category
computeAllDepartmentScores(complaints) → Array<{ department, score, metrics }>
```

### New Components

#### `src/components/StarRating.jsx`

Props: `value` (1–5 | null), `onChange` (fn | null — null = read-only), `size` ('sm' | 'md')

Renders 5 star buttons. When `onChange` is null, renders read-only filled stars. Validates that submitted value is 1–5 before calling `onChange`.

#### `src/components/OverdueBadge.jsx`

Props: `complaint`

Renders nothing if complaint is resolved. Renders "Open Xh" in neutral style if < 48h. Renders "Overdue" in red if >= 48h. Uses a `useEffect` with a 60-second `setInterval` to keep the displayed time current.

#### `src/components/UpvoteButton.jsx`

Props: `complaint`, `onUpvote` (fn)

Reads `getSessionId()` to determine if the current session has already upvoted. Renders an upvote button with count. Shows "High Community Interest" badge when `upvotes > 10`. Disabled and highlighted when already upvoted.

#### `src/components/ReopenModal.jsx`

Props: `complaint`, `onReopen` (fn), `onClose` (fn)

Modal overlay with a textarea for the reopen reason. Validates minimum 10 characters before calling `onReopen`. Displays inline validation error on short input.

#### `src/components/DepartmentScoreCard.jsx`

Props: `department` (string), `score` (number), `metrics` (object), `expanded` (bool)

Renders department name, color-coded score badge (green ≥ 70, amber 40–69, red < 40), and optionally the full metric breakdown (avg resolution time, % resolved, % reopened, % overdue).

#### `src/components/AnalyticsCharts.jsx`

Props: `complaints`

Internally computes all aggregates via `useMemo`. Renders four Recharts charts:
1. `BarChart` — complaints by category
2. `BarChart` — complaints per day (last 30 days)
3. `PieChart` — complaints by status
4. Agent leaderboard table (sorted by resolved count desc) with avg resolution time column

#### `src/components/DuplicateWarning.jsx`

Props: `duplicate` (complaint | null), `onProceed` (fn), `onCancel` (fn)

Renders nothing when `duplicate` is null. When present, renders a warning banner with the existing complaint's ID, title, and status, plus Proceed and Cancel buttons.

### Modified Files

| File | Changes |
|------|---------|
| `src/context/ComplaintContext.jsx` | New fields on complaint objects; new actions: `submitRating`, `upvoteComplaint`, `reopenComplaint`; expose `departmentScores` |
| `src/lib/agents.js` | `assignAgent` enhanced with workload-aware ranking + optional Gemini re-ranking |
| `src/lib/aiAnalysis.js` | `analyzeComplaintImage` already returns `detectedCategory`, `summary`, `severity`; add text-only `analyzeComplaintText` path |
| `src/pages/Report.jsx` | Auto-fill title from AI summary; duplicate detection before submit; `DuplicateWarning` integration |
| `src/pages/Track.jsx` | `StarRating` widget for resolved complaints; `ReopenModal` trigger; `OverdueBadge` |
| `src/pages/Admin.jsx` | `AnalyticsCharts` section; `OverdueBadge` on complaint cards; "Reopened" badge; upvote sort mode; department score breakdown |
| `src/pages/Home.jsx` | `upvotes` count on recent complaint cards; `DepartmentScoreCard` section |

---

## Data Models

### Extended Complaint Object

The existing complaint shape is extended with the following new fields. All fields are persisted to localStorage via the existing `useEffect` in `ComplaintContext`.

```ts
interface Complaint {
  // --- existing fields (unchanged) ---
  id: string
  complaintNumber: string
  title: string
  category: string
  otherCategory: string
  imageUrl: string
  status: 'reported' | 'assigned' | 'in_progress' | 'resolved'
  createdAt: string          // ISO 8601
  updatedAt: string          // ISO 8601
  locationName: string
  coordinates: { lat: number; lng: number }
  remarks: string
  resolutionDescription: string
  proofImageUrl: string
  assignedAgent: Agent | null
  aiSummary: string
  aiSeverity: string
  timeline: TimelineEntry[]

  // --- new fields ---
  satisfactionRating: number | null   // 1–5, null until submitted (Req 1)
  upvotes: number                     // default 0 (Req 8)
  upvotedBy: string[]                 // session IDs (Req 8)
  reopenCount: number                 // default 0 (Req 9)
  duplicateOf: string | null          // complaintNumber of original, or null (Req 5)
}
```

### TimelineEntry (unchanged shape, new status values)

```ts
interface TimelineEntry {
  status: 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'reopened'
  note: string
  timestamp: string  // ISO 8601
}
```

The `'reopened'` status value is added to `STATUS_META` in `complaintUtils.js` with amber color.

### Agent Object (unchanged shape)

```ts
interface Agent {
  id: string
  name: string
  phone: string
  role: string
  categories: string[]
  available: boolean
  ward: string
}
```

### DepartmentScore (new, computed — not persisted)

```ts
interface DepartmentScore {
  department: string        // primary category key, e.g. 'water'
  label: string             // human-readable, e.g. 'Water Supply'
  score: number             // 0–100 integer
  metrics: {
    avgResolutionHours: number
    resolvedPct: number     // 0–1
    reopenedPct: number     // 0–1
    overduePct: number      // 0–1
  }
}
```

### ComplaintContext Exposed Value (additions)

```ts
interface ComplaintContextValue {
  // existing
  complaints: Complaint[]
  stats: Stats
  createComplaint: (input) => Complaint
  updateComplaint: (id, updates) => Complaint | null
  getComplaintByNumber: (num) => Complaint | null

  // new
  submitRating: (id: string, rating: number) => void
  upvoteComplaint: (id: string, sessionId: string) => void
  reopenComplaint: (id: string, reason: string) => void
  departmentScores: DepartmentScore[]
}
```

### localStorage Schema

The existing `STORAGE_KEY = 'smartcity-complaints-v2'` is reused. New fields are added to each complaint object in the array. Seed complaints are updated to include the new fields with their defaults. No migration is needed since the seed data is only used when localStorage is empty.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

