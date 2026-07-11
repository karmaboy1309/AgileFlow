# AgileFlow Database Schema & Index Strategy

We use MongoDB Atlas for cloud database storage.

## Core Schemas
- **User**: Name, Email, Password (hashed), bio, and settings.
- **Project**: Name, Key, description, and templates context.
- **Sprint**: Name, startDate, endDate, and status.
- **Task**: Title, description, status, priority, storyPoints, assignees, and custom field values.

## Index Strategy
To optimize board query times, compound indexes are built on Task fields like `projectId`, `sprintId`, and `epicId`.
