# OSC Dashboard v1.5.0

**Complete GitHub repository package — November 5, 2026**

## What's new

### 1. Separate SDG Explorer: `sdg.html`

- Dedicated minimal SDG page (no longer mixed with Statistics).
- All 17 SDGs are individually selectable.
- Selecting multiple SDGs requires ALL selected SDGs to be present in each request. Other SDGs may also be present.
- Results are limited to **Request ID · Activity / Event Title · SDG numbers · Open arrow**.
- Search by RID/title, optional Include archived filter, and incremental Show more.
- The arrow links to the request's full entry in the main Dashboard.

### 2. Statistics: `statistics.html`

- Dedicated statistics/administration page without the SDG selection grid.
- Date, status, archived filters; metrics; completed-by-staff; request type, office and output breakdowns.
- Archived request shortcut and public Form availability controls remain.
- Report export is still **planned, not implemented**.

### 3. Separate Intern Post Desk: `facebook-posts.html`

- Standalone, mobile-friendly page with **no navigation links to the Dashboard or Statistics**.
- Requires an intern access code before loading a posting queue.
- Shows **only** non-archived requests with `Posting` in the Sheet's **Request** field, where the **Facebook Post Links** cell is still empty.
- Displays only Request ID and activity/event title to the intern, not requester emails or other management fields.
- Swipe-card mode: swipe left to skip, swipe right to save the link if the entered Facebook URL is valid; visible Skip and Save buttons also work.
- Table mode: search, paste URL directly on a row, save.
- Once the link is saved, that request disappears from the pending queue. Repeat submissions are blocked by the backend.
- Supports only full HTTPS Facebook and fb.watch URLs.
- Existing `addFacebookPostLinks` admin action remains unchanged for backward compatibility.

## Complete GitHub file list

Upload all FRONTEND files below to the **root** of `panpacificu/osc-dashboard`:

```
index.html
statistics.html
sdg.html
facebook-posts.html
script.js
statistics.js
sdg.js
facebook-posts.js
style.css
workspace.css
explorer.css
intern.css
config.js
.nojekyll
README.md
```

`apps-script/Dashboard.gs` is the **Apps Script source copy**, NOT an automatically deployed GitHub Pages backend.

## Installation order

### A. Back up the current production Apps Script code

Before replacing, copy your current `Dashboard.gs` into a local backup. Keep the current production deployment active until the new version is tested.

### B. Update the Dashboard Apps Script project

1. Use `apps-script/Dashboard.gs` to update the **existing Dashboard Apps Script project** (not the Form and not the Tracker project).
2. Preserve the actual `CONFIG.SPREADSHEET_ID` and exact `CONFIG.SHEET_NAME` from your working version. The ZIP source contains a **placeholder Sheet ID**.
3. Keep your existing `OSC_CHAT_WEBHOOK_URL` Script Property unchanged.
4. Add a NEW Script Property under **Project Settings → Script properties**:

   - Name: `OSC_INTERN_LINK_PIN`
   - Value: a distinct, nontrivial access code assigned to interns.

5. Run `testDashboardConnection`, then `testInternDeskQueue`. The intern test only **reads** the Sheet.
6. Under **Deploy → Manage deployments**, select your *current Dashboard deployment*, edit it, select **New version**, and deploy. **Do not create a new Web App URL**.

### C. Verify the production URL

The `config.js` in this package preserves the Dashboard API URL recovered from the prior GitHub version. **Before uploading, compare it to the URL in Apps Script → Manage deployments.** If they differ, update `API_URL` in `config.js` with the real `/exec` URL of the production Dashboard deployment. Do not copy in the Form or Tracker `/exec` URL.

A healthy production Dashboard endpoint recognizes both:

- `/exec?action=getRequests`
- `/exec?action=getFormStatus`

**Do not paste your intern PIN into `config.js`.** Interns type their code into the Post Desk.

### D. Restore/update the GitHub repository

Upload the FRONTEND files to the repository root (the same level as `index.html`). Commit, then hard-refresh GitHub Pages.

- Dashboard: `https://panpacificu.github.io/osc-dashboard/`
- Statistics: `https://panpacificu.github.io/osc-dashboard/statistics.html`
- SDG Explorer: `https://panpacificu.github.io/osc-dashboard/sdg.html`
- Intern Post Desk: `https://panpacificu.github.io/osc-dashboard/facebook-posts.html`

### E. Final tests

1. Main Dashboard still loads, opens requests, archives/restores, and updates statuses.
2. Form availability still works and existing emails/webhooks remain intact.
3. In SDG Explorer select SDG 1 + SDG 3. Only requests containing both should appear, even when SDG 4 is also present.
4. Open the intern page and enter the new code. Only Posting requests with no Facebook URL should appear.
5. Save one test URL. Verify the `Facebook Post Links` spreadsheet column was updated and the card disappears from the queue.
6. Confirm the table view works, archived records do not appear, and direct links to non-Posting requests cannot be logged by the intern action.

## Access limitation / important security note

Removing admin navigation from the intern page **does not restrict access** to `index.html` or `statistics.html`, because GitHub Pages hosts static public files. The access code protects only the new, limited intern endpoints; it is not Google Workspace authentication. Existing Dashboard API administrative actions also remain accessible through the public deployment under the prior architecture. **Do not treat this ZIP as secure role-based access control.** Proper restriction requires authenticated users/roles and server-side permission checks (for example, a Workspace-authenticated backend and a separately protected admin site). Do not distribute the admin URL as if this update protects it.

## Notes

- No changes to the separate Form or Tracker Apps Script projects.
- No automated PDF/Excel reports in this version.
- The intern PIN passes through JSONP GET requests because the current GitHub Pages → Apps Script deployment uses JSONP. Avoid treating it as a high-security credential; genuine access protection needs an authenticated backend.
