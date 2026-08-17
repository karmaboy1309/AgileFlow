# AgileFlow API Reference — August 17 Enterprise Updates

This documentation details the API specifications for the enterprise features introduced on August 17.

## 1. Objectives & Key Results (OKRs)

### GET `/api/okrs`
Retrieve all OKRs for a specific project or quarter.
- **Query Params**:
  - `projectId` (string): MongoDB ID of the project.
  - `quarter` (string): Period (e.g. `Q3-2025`).
- **Response**:
  - `okrs` (Array): List of populated objective objects with progress metrics.

### POST `/api/okrs`
Create a new corporate or team objective.
- **Body**:
  - `project` (string): Project ID.
  - `objective` (string, required): Title of objective.
  - `quarter` (string): e.g. `Q3-2025`.
  - `keyResults` (Array): Array of key result items.

---

## 2. Predictions & Forecasting

### GET `/api/predictions/project-completion/:projectId`
Retrieve predicted sprints needed to empty the remaining backlog based on sprint velocity.
- **Response**:
  - `metrics`: avgVelocity, remainingPoints, remainingTasksCount.
  - `projections`: optimistic, mostLikely, pessimistic completion estimates.

---

## 3. Time-Tracking Summary

### GET `/api/time-tracking/summary`
Retrieve aggregated developers work log summaries.
- **Query Params**:
  - `projectId` (string): Filter by project.
  - `startDate`, `endDate` (string): Filter by date range.
- **Response**:
  - `summary`: totalHours, billableHours, nonBillableHours.
  - `categoryBreakdown`: Category hours map.
  - `userBreakdown`: Per-developer hours log.
