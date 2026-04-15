# Requirements Document

## Introduction

This document defines the requirements for the **Smart City Enhancements** feature set added to the ShikayatTrack civic complaint application (React + Vite). The app allows citizens of Pune to report civic issues, track complaint status, and interact with an admin dashboard. The enhancements introduce ten new capabilities spanning citizen engagement, AI automation, analytics, and department accountability.

---

## Glossary

- **Citizen**: A registered or anonymous user who submits and tracks civic complaints via the app.
- **Admin**: A municipal staff member who manages complaints, assigns agents, and updates statuses via the Admin dashboard.
- **Agent**: A field worker or specialist (e.g., plumber, electrician) assigned to resolve a complaint.
- **Complaint**: A civic issue report submitted by a Citizen, stored in `ComplaintContext`.
- **ComplaintContext**: The React context (`src/context/ComplaintContext.jsx`) that manages all complaint state and localStorage persistence.
- **AI_Analyzer**: The Gemini Vision AI module (`src/lib/aiAnalysis.js`) that processes images and text to categorize and describe civic issues.
- **AI_Assigner**: The AI-powered logic (extending `src/lib/agents.js`) that selects the best Agent for a Complaint.
- **Satisfaction_Rating**: A 1–5 star score submitted by a Citizen after a Complaint is resolved.
- **Upvote**: A community support action by a Citizen on an existing Complaint to signal shared concern.
- **Department**: A logical grouping of Agents by category (e.g., Water, Roads, Sanitation).
- **Reputation_Score**: A computed score (0–100) for each Department based on resolution performance metrics.
- **Duplicate_Detector**: The logic that identifies Complaints sharing the same location and category within a configurable time window.
- **Time_Tracker**: The utility that computes how long a Complaint has been open and flags overdue ones.
- **Analytics_Dashboard**: The charts and metrics section within the Admin page.
- **Overdue_Threshold**: The fixed duration of 48 hours after which an unactioned Complaint is flagged as overdue.

---

## Requirements

### Requirement 1: Citizen Satisfaction Rating

**User Story:** As a Citizen, I want to rate my satisfaction after my complaint is resolved, so that the city can measure service quality and improve response.

#### Acceptance Criteria

1. WHEN a Complaint's status transitions to `resolved`, THE ComplaintContext SHALL attach a `satisfactionRating` field initialized to `null`.
2. WHEN a Citizen views a resolved Complaint on the Track page, THE Track_Page SHALL display a 1–5 star rating widget if `satisfactionRating` is `null`.
3. WHEN a Citizen selects a star rating and submits, THE ComplaintContext SHALL persist the `satisfactionRating` value (integer 1–5) to localStorage.
4. WHEN a `satisfactionRating` has already been submitted, THE Track_Page SHALL display the submitted rating as read-only and SHALL NOT render the rating widget again.
5. IF a Citizen attempts to submit a rating outside the range 1–5, THEN THE Track_Page SHALL display a validation error and SHALL NOT persist the value.
6. THE Analytics_Dashboard SHALL display the average `satisfactionRating` across all resolved Complaints with at least one rating.

---

### Requirement 2: Time Open Indicator

**User Story:** As a Citizen and Admin, I want to see how long a complaint has been open, so that I can identify neglected issues quickly.

#### Acceptance Criteria

1. THE Time_Tracker SHALL compute the elapsed time in hours between a Complaint's `createdAt` timestamp and the current time for all Complaints with status other than `resolved`.
2. WHEN the elapsed time is less than 48 hours, THE Complaint_Card SHALL display the elapsed time in a neutral style (e.g., "Open 12h").
3. WHEN the elapsed time equals or exceeds the Overdue_Threshold of 48 hours, THE Complaint_Card SHALL display the label "Overdue" with red styling on both the Admin dashboard and the Track page.
4. WHEN a Complaint's status transitions to `resolved`, THE Complaint_Card SHALL stop displaying the time open indicator.
5. THE Time_Tracker SHALL update the displayed elapsed time without requiring a page reload, refreshing at most every 60 seconds.

---

### Requirement 3: AI Auto-Assign Agent

**User Story:** As an Admin, I want the system to automatically assign the best available agent to a complaint using AI, so that manual assignment effort is reduced and expertise is matched to the issue.

#### Acceptance Criteria

1. WHEN a new Complaint is created, THE AI_Assigner SHALL select the Agent whose `categories` array includes the Complaint's effective category and whose `available` flag is `true`.
2. WHEN multiple Agents match the category and availability criteria, THE AI_Assigner SHALL rank candidates by workload (fewest currently assigned open Complaints) and select the Agent with the lowest workload.
3. WHEN no Agent matches the category, THE AI_Assigner SHALL fall back to any available Agent with the lowest workload.
4. WHEN no Agent is available, THE AI_Assigner SHALL assign the Complaint to the Agent with the lowest total open Complaint count regardless of availability flag.
5. THE AI_Assigner SHALL use the Gemini API (key: `VITE_GEMINI_API_KEY`) to re-rank candidates when the Complaint has an `aiSummary`, providing the summary as context for scoring.
6. IF the Gemini API call fails or times out within 3 seconds, THEN THE AI_Assigner SHALL fall back to the workload-based ranking without blocking Complaint creation.
7. THE ComplaintContext SHALL expose the assigned Agent on the Complaint object immediately after creation.

---

### Requirement 4: Admin Analytics Charts

**User Story:** As an Admin, I want to see visual charts about complaint volumes and worker performance, so that I can make data-driven operational decisions.

#### Acceptance Criteria

1. THE Analytics_Dashboard SHALL display a bar chart showing the count of Complaints grouped by category.
2. THE Analytics_Dashboard SHALL display a line or bar chart showing Complaint submission counts grouped by day for the last 30 days.
3. THE Analytics_Dashboard SHALL display a chart showing the distribution of Complaints by status (`reported`, `assigned`, `in_progress`, `resolved`).
4. THE Analytics_Dashboard SHALL display a leaderboard table of Agents ranked by number of resolved Complaints in descending order.
5. THE Analytics_Dashboard SHALL display the average resolution time (in hours) per Agent for resolved Complaints.
6. WHEN the underlying Complaint data changes, THE Analytics_Dashboard SHALL re-render all charts to reflect the updated data without requiring a page reload.
7. WHERE the Recharts library is available, THE Analytics_Dashboard SHALL use Recharts components for all chart rendering.

---

### Requirement 5: Duplicate Complaint Detection

**User Story:** As a Citizen, I want to be warned before submitting a duplicate complaint, so that I avoid creating redundant reports for the same issue.

#### Acceptance Criteria

1. THE Duplicate_Detector SHALL identify an existing Complaint as a potential duplicate when it shares the same `category` and has `coordinates` within 100 meters of the new Complaint's location, and was created within the last 72 hours.
2. WHEN a potential duplicate is detected during Complaint submission on the Report page, THE Report_Page SHALL display a warning banner listing the existing Complaint's ID, title, and current status before the Citizen confirms submission.
3. WHEN a Citizen acknowledges the warning and chooses to proceed, THE ComplaintContext SHALL create the new Complaint normally and SHALL link it to the existing Complaint via a `duplicateOf` field.
4. WHEN a Citizen chooses to cancel after seeing the duplicate warning, THE Report_Page SHALL return to the form without creating a new Complaint.
5. IF no duplicate is detected, THEN THE Report_Page SHALL proceed to submission without displaying any warning.
6. THE Duplicate_Detector SHALL use the Haversine formula to compute distances between coordinates.

---

### Requirement 6: AI-Powered Complaint Categorization

**User Story:** As a Citizen, I want the AI to automatically categorize my complaint from my photo or description, so that I don't have to manually select the correct category.

#### Acceptance Criteria

1. WHEN a Citizen uploads an image on the Report page, THE AI_Analyzer SHALL call the Gemini Vision API with the image and return a `detectedCategory`, `confidence`, `summary`, and `severity` within 10 seconds.
2. WHEN the AI_Analyzer returns a `detectedCategory` with `confidence` of `high` or `medium`, THE Report_Page SHALL automatically set the category dropdown to the detected value.
3. WHEN the AI_Analyzer returns a `confidence` of `low`, THE Report_Page SHALL suggest the detected category but SHALL NOT auto-select it, displaying a note that manual confirmation is recommended.
4. WHEN no image is uploaded, THE AI_Analyzer SHALL accept a plain-text description and return a `detectedCategory` and `confidence` based on keyword matching against the category hints.
5. IF the Gemini API call fails, THEN THE AI_Analyzer SHALL return a fallback result with `confidence: 'low'` and `detectedCategory: 'other'` without throwing an error.
6. THE Report_Page SHALL display the AI analysis result badge showing `detectedCategory`, `confidence`, and `summary` after analysis completes.

---

### Requirement 7: Live Demo Photo-to-Form

**User Story:** As a Citizen, I want to upload a photo of a civic issue and have the complaint form auto-fill itself, so that reporting is fast and requires minimal manual input.

#### Acceptance Criteria

1. WHEN a Citizen uploads a photo on the Report page, THE AI_Analyzer SHALL analyze the image and return structured data including `detectedCategory`, `summary`, and `severity`.
2. WHEN the AI_Analyzer returns a result, THE Report_Page SHALL auto-populate the `category` field with `detectedCategory` and the `title` field with a human-readable title derived from `summary` if the title field is currently empty.
3. WHEN the AI_Analyzer returns a `severity` of `critical`, THE Report_Page SHALL visually highlight the severity badge in red to draw the Citizen's attention.
4. WHEN the Citizen modifies any auto-filled field, THE Report_Page SHALL preserve the Citizen's input and SHALL NOT overwrite it on subsequent AI updates.
5. IF the AI_Analyzer returns no result or an error, THEN THE Report_Page SHALL leave all form fields in their current state and display a non-blocking notice that AI auto-fill is unavailable.

---

### Requirement 8: Upvote / Community Support

**User Story:** As a Citizen, I want to upvote an existing complaint, so that high-priority shared issues receive more visibility and faster resolution.

#### Acceptance Criteria

1. THE ComplaintContext SHALL store an `upvotes` integer field (default `0`) and an `upvotedBy` array of session identifiers on each Complaint.
2. WHEN a Citizen clicks the upvote button on a Complaint, THE ComplaintContext SHALL increment `upvotes` by 1 and add the Citizen's session identifier to `upvotedBy`.
3. WHEN a Citizen has already upvoted a Complaint in the current session, THE Complaint_Card SHALL display the upvote button in an active/highlighted state and SHALL NOT allow a second upvote.
4. THE Home_Page SHALL display the `upvotes` count on each Complaint card in the recent complaints list.
5. THE Admin_Dashboard SHALL sort the complaint list by `upvotes` descending as an optional filter/sort mode.
6. WHEN `upvotes` exceeds 10, THE Complaint_Card SHALL display a "High Community Interest" badge.
7. THE ComplaintContext SHALL persist `upvotes` and `upvotedBy` to localStorage.

---

### Requirement 9: Reopen Complaint

**User Story:** As a Citizen, I want to reopen a resolved complaint if the issue persists, so that unresolved problems are not incorrectly closed.

#### Acceptance Criteria

1. WHEN a Complaint has status `resolved`, THE Track_Page SHALL display a "Reopen Complaint" button visible to the Citizen.
2. WHEN a Citizen clicks "Reopen Complaint" and provides a reason (minimum 10 characters), THE ComplaintContext SHALL transition the Complaint's status to `reported` and append a timeline entry with the reason and timestamp.
3. WHEN a Complaint is reopened, THE ComplaintContext SHALL increment a `reopenCount` integer field on the Complaint.
4. WHEN a Complaint is reopened, THE ComplaintContext SHALL clear the `satisfactionRating` field to `null` so the Citizen can re-rate after the next resolution.
5. IF a Citizen attempts to reopen without providing a reason of at least 10 characters, THEN THE Track_Page SHALL display a validation error and SHALL NOT reopen the Complaint.
6. THE Admin_Dashboard SHALL display a "Reopened" badge on Complaints with `reopenCount` greater than 0.
7. THE ComplaintContext SHALL persist `reopenCount` to localStorage.

---

### Requirement 10: Department Reputation Score

**User Story:** As a Citizen and Admin, I want to see a reputation score for each department, so that accountability is transparent and citizens can assess service quality.

#### Acceptance Criteria

1. THE Reputation_Score for a Department SHALL be computed as a weighted composite of: average resolution time (lower is better, 40% weight), percentage of Complaints resolved vs total (higher is better, 30% weight), percentage of Complaints reopened vs resolved (lower is better, 20% weight), and percentage of Complaints overdue vs total (lower is better, 10% weight).
2. THE Reputation_Score SHALL be normalized to a 0–100 integer scale, where 100 represents optimal performance across all metrics.
3. WHEN the underlying Complaint data changes, THE Reputation_Score SHALL be recomputed without requiring a page reload.
4. THE Home_Page SHALL display a "Department Scores" section listing each Department with its Reputation_Score and a color-coded indicator (green ≥ 70, amber 40–69, red < 40).
5. THE Admin_Dashboard SHALL display the full Reputation_Score breakdown per Department, including each contributing metric value.
6. WHEN a Department has zero resolved Complaints, THE Reputation_Score SHALL default to 50 (neutral) to avoid division-by-zero errors.
7. THE Reputation_Score computation SHALL group Agents by their primary category to determine Department membership.
