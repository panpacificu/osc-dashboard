# OSC Dashboard v1.6.2 — Installation & Upgrade Walkthrough

**You can install this directly from any prior working version.** The complete frontend and Dashboard Apps Script source are provided.


## New in v1.6.2: Better Intern SDG Tagging Desk

- Full-size best-effort **Facebook post/video iframe preview** for public posts (a fallback **Open original** link remains for posts Meta will not embed). Facebook controls whether a post is embeddable; no API token is used.
- 17 **SDG-colored tiles** with original thematic outline icons and goal names. These are not official UN icon assets.
- **Core Values are always visible**, not hidden in a dropdown, and at least one is required when saving. Existing values on pending rows are preselected.
- **Post title** is editable in the card; saving writes the title to column C.
- One **Save changes & next** button saves title, 1–5 SDGs (E–I), and 1–4 Core Values (J–M) together; a green notification confirms success. On failure the card remains open.
- Neither the Facebook URL in D nor the Summary & Grouping tab is changed by tagging.
- The **original request-based Post Desk** and monthly CSV importer remain unchanged.

**Important:** Because saving the title is a new server-side capability, you **MUST redeploy Dashboard.gs** as an updated version of your **existing** Apps Script deployment. Uploading GitHub files alone will not save title edits.

### If you already have v1.6.1 running

1. **Back up:** Copy your current working Dashboard.gs, your live config.js, and the monitoring Sheet.
2. **Apps Script:** Update only the existing Dashboard Apps Script project with `apps-script/Dashboard.gs`. **Before replacing, replace `PASTE_YOUR_SPREADSHEET_ID_HERE` with the actual MCR Sheet ID from your current live script** and verify any other locally customized CONFIG/staff fields. Do not touch Form.gs or Tracker.gs.
3. **Script Properties:** Keep `OSC_INTERN_LINK_PIN`, `OSC_POST_IMPORT_PIN`, `OSC_CHAT_WEBHOOK_URL` as they are. No new secret is required.
4. Run `testDashboardConnection()` and `testMonitoringConnection()` in Apps Script. These only read data.
5. **Deploy → Manage deployments → edit the CURRENT Dashboard deployment → New version → Deploy.** Reuse the existing URL.
6. **Frontend:** Upload the updated root frontend files to the repository root. At minimum the Tagging Desk needs `post-sdg-desk.html`, `post-sdg-desk.js`, and **new** `post-sdg-desk.css`. Other page footers and `config.js` are updated to 1.6.2 in this complete package. If you copy over `config.js`, first compare its API_URL to your current live version; prefer retaining your currently working URL.
7. Visit `/post-sdg-desk.html`, sign in with the existing intern PIN, and test one untagged post. Change its title, select SDGs and at least one Core Value, save, and check cells C and E–M in that Sheet row. Existing tagged posts remain locked out of the queue.

No live production Sheet was edited while building this package.

---

## What this release connects

| Component | Where it runs | What it does |
| --- | --- | --- |
| Dashboard / Statistics / SDG Explorer | GitHub Pages + Dashboard.gs | Manages MCR requests and reporting |
| Monthly CSV Import (`import-posts.html`) | GitHub Pages + Dashboard.gs | Imports Facebook post metadata to the monitoring sheet |
| Intern SDG Tagging Desk (`post-sdg-desk.html`) | GitHub Pages + Dashboard.gs | Saves SDGs and core values to the monitoring sheet |
| Request Form and Tracker | Their EXISTING separate projects | No changes required |

## Step 1 — Back up first

1. Copy your existing production `Dashboard.gs` from the **Dashboard Apps Script project** into a safe text file.
2. In Google Sheets, open **PU FB Page Posts Monitoring Sheet 2026** and make a backup copy. Do not edit the original monitoring tabs yet.
3. Keep a copy of your current working GitHub repository files, especially `config.js` and its `API_URL`.

## Step 2 — Verify both Google Sheet connections

In `apps-script/Dashboard.gs`, find:

```javascript
SPREADSHEET_ID: 'PASTE_YOUR_SPREADSHEET_ID_HERE'
```

Replace the placeholder **with the actual MCR Requests Google Sheet ID** (NOT the Facebook monitoring sheet ID). Verify the `SHEET_NAME` matches its exact tab name, such as `Form Responses` or `Form Responses 1`.

The SAME file also contains:

```javascript
const MONITORING_CONFIG = {
  SPREADSHEET_ID: '1z3iOYk_ODNrrlyZXKCwNk1i14OIFmYHbV2fgsv2-r-I',
  TAB_NAME: 'Post Monitoring Log',
```

This second ID correctly points to your **Facebook monitoring workbook**. Do not replace it with the MCR spreadsheet ID.

## Step 3 — Configure Script Properties

In the **Dashboard Apps Script project**: **Project Settings → Script properties**.

- `OSC_CHAT_WEBHOOK_URL`: keep your existing Google Chat webhook, if used.
- `OSC_INTERN_LINK_PIN`: keep your existing intern PIN; used by the intern tagging desk.
- `OSC_POST_IMPORT_PIN`: add a NEW, different import code for OSC staff.

Save the properties. Do **not** paste the PINs in JavaScript or upload them to GitHub. No property for the monitoring sheet ID is needed; the Sheet ID is in `MONITORING_CONFIG`.

## Step 4 — Install the Dashboard Apps Script backend

1. Open the **existing Dashboard Apps Script project** (not the Form or Tracker project).
2. Replace the entire current `Dashboard.gs` contents with `apps-script/Dashboard.gs` from this ZIP. If you have other customizations (staff emails/signature IDs), preserve them in the new source first.
3. Save the code.
4. Run `testDashboardConnection` (read-only).
5. Run `testMonitoringConnection` (read-only). It must identify `Post Monitoring Log`.
6. Confirm both are successful before deployment.
7. Go to **Deploy → Manage deployments → select the production Dashboard deployment → Edit (pencil) → Version: New version → Deploy**.
8. **Do not click New deployment** unless you intend to change the frontend's API URL.
9. Existing URL stays the same when you update that deployment.

## Step 5 — Verify the correct Dashboard API URL

In `config.js` find:

```javascript
API_URL: 'https://script.google.com/macros/s/…/exec'
```

The bundled URL came from a previous GitHub version and has **NOT** been confirmed against your currently active deployment.

1. Copy the **Web App URL** from the production Dashboard deployment you just updated.
2. If `config.js` is different, replace only its `API_URL` value with the **actual** production URL.
3. In a browser, test these actions using that exact URL:

```text
DASHBOARD_EXEC_URL?action=getRequests
DASHBOARD_EXEC_URL?action=getFormStatus
```

Both must return `success: true`. If either returns `Invalid API action`, stop and check which deployment was updated. Never substitute the Form or Tracker URL.

## Step 6 — Upload the COMPLETE frontend to GitHub

1. Extract this ZIP locally.
2. Open `panpacificu/osc-dashboard` on GitHub.
3. Upload the **contents** of the extracted folder to the repository ROOT (not the folder itself). Ensure `index.html`, `config.js`, `import-posts.html`, etc. appear in the root file listing.
4. Do **not** accidentally upload the old `config.js` over your working API URL. Use the URL you verified in Step 5.
5. The `apps-script/` folder is only a reference backup; GitHub Pages does not execute `.gs` files.
6. Commit all changes. GitHub Pages should serve from `main` → `/ (root)` (if that is how your repository is configured).
7. Hard refresh the pages (`Ctrl+F5`) or use a private browser window.

## Step 7 — Open the new pages

Main Dashboard:
https://panpacificu.github.io/osc-dashboard/

Monthly CSV Import (OSC staff):
https://panpacificu.github.io/osc-dashboard/import-posts.html

Intern SDG Tagging Desk:
https://panpacificu.github.io/osc-dashboard/post-sdg-desk.html

The previously available Request Form, Tracker, SDG Explorer, Statistics, and request-based Post Desk remain separate/unchanged where indicated.

## Step 8 — Test the intern tagging connection first

1. Open **post-sdg-desk.html**.
2. Enter the intern PIN.
3. Verify it loads pending posts, or explicitly shows an empty queue if all existing posts are already tagged.
4. Do not change existing tagged records just to test.

## Step 9 — Preview the October 2026 CSV

1. Open **import-posts.html**.
2. Select `Oct-01-2026_Oct-31-2026_1843702146652459.csv` (your previously uploaded Meta export).
3. Confirm these exact mappings:
   - Published date: **Publish time**
   - Post title/caption: **Title**
   - Published URL: **Permalink**
   - Date format: **MM/DD/YYYY**
4. Click **Preview posts**. The local structural test found **75 valid rows**, 50 photo and 25 video posts.
5. Inspect titles/dates/URLs before importing. The Google Sheet contains older October posts, some with `facebook.com/share/p/...` URLs while Meta provides different URLs for the same posts.
6. To avoid duplicates, start with a SMALL TEST CSV of one or two genuinely new posts not already in the Sheet (can be made from the Meta header plus the selected records).
7. Enter the OSC staff import code (not the intern PIN), confirm import, and inspect new rows in `Post Monitoring Log`.
8. Reimport the SAME test file to verify it adds **0** duplicates by identical URL.
9. Once checked, proceed with the rest of the monthly CSV carefully. The importer sends at most 3 records per batch. If the import is interrupted, rerunning it skips exact URL duplicates already written.

## Step 10 — Daily routine

- OSC staff: Upload a monthly Meta CSV, review mapping, and import only newly published posts.
- Interns: Open `post-sdg-desk.html`, tag up to five SDGs, optionally choose up to four core values, and save.
- Sheet: `Post Monitoring Log` receives the tags. The `SDG Summary & Grouping` tab remains linked to that data.

## Troubleshooting

| Symptom | Most likely check |
| --- | --- |
| `Invalid API action` | Wrong `config.js` API URL or an older Apps Script deployment version |
| `Spreadsheet is not configured` | `CONFIG.SPREADSHEET_ID` still has a placeholder |
| `Monitoring column mismatch` | Confirm existing `Post Monitoring Log` B3:M3 headers and sheet ID |
| `Monthly CSV import access is not configured` | Add `OSC_POST_IMPORT_PIN` to the Dashboard project's Script Properties |
| `Intern access is not configured` | Save `OSC_INTERN_LINK_PIN` to that same project; refresh Project Settings |
| Import shows no valid rows | Map Meta `Publish time`, `Title`, and `Permalink`; never Meta `Date = Lifetime` |
| Duplicates across URLs | Same Facebook post may have a `share/p` link and a different post permalink; review matching titles and dates |
| Request Form / Tracker errors | Do NOT switch their API URLs to the Dashboard Web App |

**Security note:** This release relies on shared PINs and legacy JSONP/GET calls; not a secure role-based authorization system. Avoid exposing admin/import links publicly to untrusted users.

**No live data is modified by extracting or uploading the ZIP.** Data writes happen when a user confirms an import or saves an SDG selection.
