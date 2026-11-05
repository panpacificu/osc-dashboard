# OSC Dashboard v1.4.0 — Statistics, SDGs & Facebook Post Links

**Release date:** November 5, 2026  
**Scope:** Dashboard frontend + Dashboard Apps Script only  
**Keep:** Existing working `config.js`, Form backend and Tracker backend.

## Package contents

Upload these files to the **OSC Dashboard GitHub repository root**:

- `index.html` — updated dashboard navigation, Facebook links inside request details, updated footer
- `style.css` — existing compact dashboard styling, green-tinted Student rows, updated footer/navigation
- `script.js` — request management with deep links and the new modal link list
- `statistics.html` — independent full-page statistics workspace
- `statistics.js` — SDG filters, AND-combination queries, summary metrics and request matching
- `facebook-posts.html` — dedicated link-entry page for interns
- `facebook-posts.js` — search requests, select a RID, append one or many Facebook post URLs
- `workspace.css` — styling for the two new pages

Separately:

- `apps-script/Dashboard.gs` — revised Dashboard backend, version 1.4.0

**Your existing `config.js` is intentionally not included. Do not delete or overwrite it.** All three pages read the same existing `OSC_DASHBOARD_CONFIG.API_URL`.

## What's new

### 1) Footer

All pages show a consistent Office of Strategic Communications / Panpacific University footer, v1.4.0, and release date.

### 2) Full Statistics page

- The former Admin Statistics sidebar is replaced by `statistics.html`.
- Overview: matching requests, open projects, completed, unassigned, requests with Facebook links, total recorded post URLs.
- Request breakdowns: completed by staff, request type, requesting office, requested outputs.
- Date-range and request-status filters.
- Archived requests excluded by default, with an **Include archived** option.
- Form Availability toggle and closed-form message relocated to **System management**.
- Archived Requests shortcut opens the existing archived request view in the main Dashboard.
- Report-ready statistics; formal PDF / Excel report generation is intentionally deferred to a later version.

### 3) All 17 SDGs, with intersection matching

Every SDG has a clickable filter tile and a request count. Selecting **SDG 1** shows all requests tagged with SDG 1. Selecting **SDG 1 + SDG 3** shows only requests that contain **both** goals, even if they also include other SDGs (e.g., 1, 3 and 5). Filtering reads the existing `SDG` column; no new SDG database is required.

### 4) Facebook published post-link entry

The new `facebook-posts.html` page lets interns:

1. Search an OSC request by tracking number, title, office or requester.
2. Select the corresponding request.
3. See URLs already saved for that request.
4. Paste one or more Facebook post links, one URL per line.
5. Enter their OSC link-entry code and save.

Links are appended (not overwritten) and duplicate URLs are skipped. URLs are stored in a new sheet column named **`Facebook Post Links`**, created automatically if it doesn't exist. The existing Dashboard request modal also displays recorded links.

Supported URL hosts: `facebook.com`, its subdomains, and `fb.watch` over HTTPS.

**Limit:** Up to 25 links per save. The frontend submits them one at a time to keep JSONP URLs short; each successfully saved link is stored even if a later link fails. The workflow does **not** create or schedule Facebook posts; it only records links to posts already published.

## Deployment — use this order

### Step 0 — Back up

- Download a copy of the current dashboard GitHub files, especially `config.js`.
- Copy your current Dashboard Apps Script code and note your **existing working `/exec` URL**.
- Optional but recommended: back up the Google Sheet.

### Step 1 — Update Dashboard Apps Script (required)

1. Open your **existing OSC Dashboard Apps Script project** — do not use Form or Tracker projects.
2. Replace `Dashboard.gs` with `apps-script/Dashboard.gs`.
3. **Before saving, restore your real current** `SPREADSHEET_ID` and correct `SHEET_NAME` (the packaged code contains a placeholder ID). Preserve any previously configured staff settings.
4. In **Project Settings → Script properties**, keep your existing `OSC_CHAT_WEBHOOK_URL` unchanged, then add:

   - Property: `OSC_POST_LINK_PIN`
   - Value: a unique code you choose and give only to the staff/interns authorized to log links.

5. Run `testDashboardConnection` manually.
6. Go to **Deploy → Manage deployments → your active Dashboard Web App → Edit → New version → Deploy**.
7. Do **not** create a new deployment URL. This update should use your existing verified URL.

Before uploading the frontend, test:

- `YOUR_DASHBOARD_EXEC_URL?action=getRequests` — should return `success: true`.
- `YOUR_DASHBOARD_EXEC_URL?action=getFormStatus` — should return `success: true`, plus `enabled` and `message`.

The existing opening/closing email and Google Chat webhook functions are retained; verify them with a test request before broad rollout.

### Step 2 — Update GitHub

Upload/replace these eight files in the **Dashboard** repository:

```
index.html
style.css
script.js
statistics.html
statistics.js
facebook-posts.html
facebook-posts.js
workspace.css
```

**Keep `config.js` unchanged.** Don't upload `apps-script/Dashboard.gs` as a frontend JavaScript file. Then commit, allow GitHub Pages to publish, and hard-refresh with Ctrl + F5.

### Step 3 — Acceptance checks

- Open the Dashboard: verify existing requests, archives, modal, green Student rows.
- Open `statistics.html`: select SDG 1, then SDG 3; verify the result set contains **both** (other goals permitted).
- Test date and status filters, then Include archived.
- Open System management: verify form availability still matches its current saved state; do not toggle it unless intended.
- Open `facebook-posts.html`: select a test RID and save a link you control.
- Confirm that the `Facebook Post Links` column now holds that URL and the Dashboard modal displays it.
- Repeat the same URL: it should be recognized as already recorded.
- Open/complete a **test request** and verify the existing email/webhook notifications. Avoid re-triggering real emails just for testing.

## Security limitations

The current Dashboard API was originally designed as a public `execute as me` JSONP Web App, including sensitive request-management operations. **This release does not introduce true intern accounts, Google Workspace identity checks, or role-based permissions.** `OSC_POST_LINK_PIN` reduces accidental public use of the new link-entry action, but a shared code transmitted through a browser request is not an authentication system. Do not treat the new page as secure for wide public access. For real intern-only permissions, the next phase should use Google Workspace authentication and explicit server-side role checks or a dedicated authenticated service.

## Future report generation

The next iteration can add date-scoped PDF/CSV/XLSX exports, per-office and per-staff reports, all-SDG activity reports, trend charts, posts/publishing reconciliation, and scheduled reporting. **These exports are not included in v1.4.0.**
