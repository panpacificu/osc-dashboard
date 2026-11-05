# OSC Request Management Dashboard — COMPLETE GitHub Repository (v1.4.0)

**This ZIP contains all files needed to restore the OSC Dashboard GitHub Pages site after clearing the repository.**

## Website files — upload these to the repository root

```
index.html
config.js
style.css
script.js
statistics.html
statistics.js
facebook-posts.html
facebook-posts.js
workspace.css
.nojekyll
README.md
```

The `apps-script/Dashboard.gs` file is a **reference copy for your separate Apps Script project**. It is **not** a website script and is never loaded by the HTML pages.

### Recovered config.js

Unlike the previous incomplete v1.4.0 ZIP, this package includes `config.js`. The `API_URL` was recovered from the dashboard repository’s previously committed GitHub history (commit `73c397253a08b8f4a18098786a452d6e73e7b15f`, July 9, 2026). It is the **last known stored URL**, not a newly verified live endpoint.

**Please verify it** before assuming all backend features will work:

- `API_URL?action=getRequests` should return `success: true` and `requests`.
- `API_URL?action=getFormStatus` should return `success: true`, `enabled`, and `message`.

If the current production Web App uses another URL, **replace only the `API_URL` value in `config.js` with your current Dashboard deployment `/exec` URL**. Do not use the Form or Tracker Web App URL.

## How to restore the site

1. Download and extract this ZIP locally.
2. Open the GitHub `panpacificu/osc-dashboard` repository on the `main` branch.
3. Choose **Add file → Upload files** and upload all the **website files above** to the **repository root** (not nested under the extracted folder). You can also use Git to restore the entire folder contents to the repository root.
4. Commit changes and check GitHub Pages settings: **Deploy from a branch → main → / (root)**, if Pages is not already configured that way.
5. Open `https://panpacificu.github.io/osc-dashboard/` and hard refresh (Ctrl+F5).
6. Confirm Requests, Statistics & SDGs, and Facebook Post Links pages load.

## Backend — only if not already updated to v1.4.0

The new Facebook post logging and archive functions require an updated **Dashboard Apps Script**. The file to use is `apps-script/Dashboard.gs`. 

Before replacing backend code, back up the working code and restore the **actual** `SPREADSHEET_ID` and `SHEET_NAME` in the new source. The bundled backend still contains an ID placeholder. Preserve Script Properties, including `OSC_CHAT_WEBHOOK_URL`; create `OSC_POST_LINK_PIN` for link entry if missing.

Update **only the current Dashboard web-app deployment** using `Deploy → Manage deployments → Edit → New version → Deploy`, keeping its URL. Do not upload this `.gs` file as a standalone script used by GitHub Pages. Do not touch Form.gs or Tracker.gs.

## What's included in v1.4.0

- Compact request dashboard, green Student rows (where the `Requester Type` column marks them Student), Archive / Restore views
- Full Statistics page with filtering for all 17 SDGs: choosing 1 and 3 matches requests containing **both**, even with additional SDGs
- Facebook published-post-link log per request, with multiple URLs and duplicate detection
- Updated footer and navigation across all three pages
- No PDF/Excel report export yet

## Safety checks

- Confirm your actual Dashboard deployment URL works for both `getRequests` and `getFormStatus`.
- Check Facebook-link saving with a test request and verify the sheet's `Facebook Post Links` column.
- Check form availability, then open/complete a test request to verify email and Google Chat webhooks.
- The current shared intern code is not full authentication. Restrict who receives it.

**Note:** This package restores the Dashboard repository only; the Request Form and Request Tracker live in separate repositories and are not part of this ZIP.
