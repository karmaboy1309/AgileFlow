# AgileFlow PWA Installation & Offline Support

This document details configurations for setting up and testing the Progressive Web App (PWA) components of AgileFlow.

## 1. Manifest Details

The web manifest is linked in `index.html` and available at `/manifest.json`.
It configures:
- App display mode (`standalone`).
- Start URL and branding colors (`#0f172a`).
- App shortcut titles for mobile home screens.

## 2. Service Worker Strategy

The service worker (`public/service-worker.js`) utilizes:
- **Cache-first** strategy for static files (HTML, CSS, JS, manifest).
- **Network-first** strategy for API endpoints (`/api/*`), falling back to cached responses when offline.
- Automatic route navigation recovery (redirects broken offline fetches to `/index.html` navigation).
