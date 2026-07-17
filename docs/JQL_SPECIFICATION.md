# JQL (Jira Query Language) Specification

JQL provides flexible, structured search capabilities across all issues.

## Supported Operators
- `=`: Exact matching (e.g. `status = todo`).
- `!=`: Exclusion matching.
- `IN`: Set inclusion (e.g. `assignee IN (user1, user2)`).
- `CONTAINS`: Full-text search wildcard matching (e.g. `title CONTAINS "button"`).

## Order By
Search outputs can be sorted by priority or date:
`order by priority desc`
