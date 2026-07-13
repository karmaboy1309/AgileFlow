# AgileFlow API Conventions & Standards

API endpoints must adhere to these structural design guidelines.

## JSON Payloads
All endpoints return responses in structured JSON format. Top-level variables should be descriptive:
`{ "task": { ... }, "message": "Success" }`

## Error Response Schemas
Errors are returned as:
`{ "message": "Validation failed", "errors": { ... } }`

HTTP status codes map to specific scenarios (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Rate Limited).
