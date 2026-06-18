# OSC Dashboard v1.3.1

## Included files

### Upload to GitHub repository
- `index.html`
- `style.css`
- `script.js`
- `config.js`

### Paste into Apps Script
- `OSCDashboard.gs`

## Important setup

1. In `config.js`, replace:

```js
const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```

with your actual Apps Script `/exec` Web App URL.

2. In `OSCDashboard.gs`, optional webhook setup:

```js
CHAT_WEBHOOK_URL: '',
CHAT_WEBHOOK_PLATFORM: 'google_chat'
```

Leave `CHAT_WEBHOOK_URL` blank to disable chat notifications.

Supported platform values:
- `google_chat`
- `slack`
- `discord`
- `teams`

3. After editing Apps Script, redeploy:

Deploy → Manage deployments → Edit → New version → Deploy

## New in v1.3.1

- Added `config.js` so API URL, version, and timestamp can be edited without touching `script.js`

## New in v1.3.0

- Floating Admin Summary button
- Admin summary card:
  - Overview counts
  - Completed by staff
  - Requests by type
  - Top offices
  - Requested outputs
- Footer with version and last updated timestamp
- Optional webhook notification when a task is completed
