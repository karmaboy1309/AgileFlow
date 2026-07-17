# Outgoing Webhooks Trigger Payloads

Webhooks send structured POST JSON bodies to registered endpoint targets.

## Payload Layout
```json
{
  "event": "task.status_changed",
  "source": "agileflow",
  "timestamp": "2026-08-19T12:00:00.000Z",
  "data": {
    "entityType": "task",
    "entityId": "60d000000000000000000001",
    "actorId": "60d000000000000000000002",
    "from": "in-progress",
    "to": "done"
  }
}
```
Outgoing payloads are signed with `X-AgileFlow-Signature` when a secret key is configured.
