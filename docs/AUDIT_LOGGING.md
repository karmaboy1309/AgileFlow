# Audit Logging Compliance

System activities are logged to preserve compliance tracks.

## Logged Events
- User authentication events (successful logins, failures).
- Project deletions and creation.
- Webhook trigger state updates and delivery failures.
- RBAC permissions modifications.

Audit logs are stored inside the `AuditLog` collection and cannot be updated or deleted by normal API users.
