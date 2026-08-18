# AgileFlow Maintenance & Health Monitoring

This document details steps for administering and checking the system health diagnostics.

## 1. System Health API

The health diagnostics endpoints are mounted at `/api/maintenance/system-health`.
This returns structured system stats:
- Process memory utilization (rss, heapTotal, heapUsed) in Megabytes.
- Node.js platform context and CPU cores count.
- MongoDB database connection status.
- Process uptime in seconds.

## 2. Alerts & Log Management

If memory utilization exceeds 85% of total system memory, check for heap allocation anomalies or leak triggers.
For production setups, connect tools like Prometheus or Datadog to pull status metrics regularly.
