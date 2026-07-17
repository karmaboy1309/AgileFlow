# Third-Party Integrations Guide

This guide explains how to connect AgileFlow events to external platforms.

## 1. Slack Webhooks
1. In Slack, create an Incoming Webhook and copy the URL.
2. In AgileFlow, navigate to **Project Settings > Integrations** and add a webhook target with the URL.
3. Configure the trigger event (e.g. `task.status_changed`).

## 2. GitHub Syncing
1. In your GitHub repository, configure webhook triggers pointing to the AgileFlow webhooks receiver `/api/webhooks`.
2. Secure the incoming updates with a shared secret verified via HMAC-SHA256 signature payloads.
