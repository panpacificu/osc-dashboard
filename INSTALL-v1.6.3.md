# v1.6.3 — Step-by-step installation

This is a **complete update from v1.6.2**, not an incremental patch. No separate v1.6.0 or v1.6.1 installation is needed.

## A. Back up before changing anything

1. Download your **current GitHub repository files** and save the working `config.js`.
2. Copy the **working Dashboard Apps Script** (`Dashboard.gs`) to a local backup or Google Drive file. **Record the current `CONFIG.SPREADSHEET_ID`, `SHEET_NAME`, staff entries and any customizations.**
3. In Google Sheets, make a backup copy of **PU FB Page Posts Monitoring Sheet 2026**.
4. Note the current Web App deployment URL from `Apps Script → Deploy → Manage deployments`. It must remain unchanged after this update.

## B. Update the Dashboard Apps Script (required)

1. Open the **existing standalone Dashboard Apps Script project**, not the Request Form or Tracker projects.
2. From the ZIP, open `apps-script/Dashboard.gs` and copy its full contents into the project's existing `Dashboard.gs`.
3. **BEFORE SAVING**, replace the placeholder in `CONFIG.SPREADSHEET_ID` with your **actual working MCR spreadsheet ID** from the old code, and confirm `SHEET_NAME` exactly matches your MCR tab. Preserve staff and local configuration.
4. Keep the `MONITORING_CONFIG.SPREADSHEET_ID` as the provided Facebook monitoring workbook ID, unless your actual workbook has changed.
5. Open **Project Settings → Script Properties**. Keep your existing `OSC_INTERN_LINK_PIN`, `OSC_POST_IMPORT_PIN` and any `OSC_CHAT_WEBHOOK_URL`. Don't put the PINs in GitHub code.
6. Save the code and manually run `testDashboardConnection` then `testMonitoringConnection`. Resolve any errors before deploying. Both tests only read data.
7. Select `Deploy → Manage deployments → your current Dashboard deployment → Edit → Version: New version → Deploy`. **Do not use New deployment.** Confirm the `/exec` URL is unchanged.

### What the backend adds

The new queue checks **N3** in the `Post Monitoring Log`. On first Tagging Desk load, if N3 is blank it sets it to `Tagging Queue Deferred At` and records deferred timestamps in column N for individual untagged posts. It **does not move or delete rows** or alter `SDG Summary & Grouping` formulas. Existing columns B–M still hold dates, titles, links, SDGs and Core Values.

## C. Replace the GitHub frontend files

1. Extract the ZIP. Open the extracted folder itself.
2. Inspect `config.js`: compare `API_URL` with your **actual Dashboard `/exec` deployment URL**. If different, paste the verified current production URL; do not use guessed URLs.
3. Go to https://github.com/panpacificu/osc-dashboard on the `main` branch. Upload **all frontend files and the new `post-database.html`, `.js`, `.css`** to the repository **root**, not a new nested folder. Keep `apps-script/` as a reference folder if uploaded, but GitHub Pages doesn't run `.gs`.
4. Commit your changes. Ensure GitHub Pages uses `main → /(root)`.
5. Perform a hard refresh (Ctrl+Shift+R). The footer/config version should read **v1.6.3**.

**To pause the legacy desk:** This ZIP includes a `facebook-posts.html` pause notice that replaces the old active page. The old desk is removed from all navigation. The older `facebook-posts.js` and `intern.css` files can be deleted from the repository if still present; they are no longer used.

## D. Test the intern workflow

1. Open https://panpacificu.github.io/osc-dashboard/post-sdg-desk.html.
2. Enter the existing **intern access code** (`OSC_INTERN_LINK_PIN`).
3. Select an untagged post and press **Move to end ↪**. Wait for a confirmation and reload.
4. Refresh the page, log back in and check that untouched items appear first and deferred posts stay at the back.
5. Select another post. Edit the title, choose 1–5 SDGs and 1–4 Core Values. Press **Save changes & next**.
6. Check that a **saved** notification appears and the pending list automatically refreshes from the live Sheet.
7. Confirm the changed title, SDGs and Core Values appear in columns **C, E–I, and J–M** of the monitoring Sheet. The post should now be absent from the pending queue.
8. Confirm `N3` contains the queue header and deferred entries have timestamps in N, but that the SDG Summary tab is unchanged.

## E. Test the Facebook Post Database

1. Open https://panpacificu.github.io/osc-dashboard/post-database.html.
2. Use either the intern code or OSC import code.
3. Search for a known published post title. Optionally filter by **month**, **SDG**, or **Core Value**.
4. Click a result. Confirm its **date**, colored SDG chips, Core Values, and embedded Facebook preview (where eligible).
5. Click **Open original Facebook post ↗** to open the Facebook page in a new tab.
6. Return to the Tagging Desk and confirm it also has a **Search Post Database** link, but not management/admin navigation.
7. Confirm the old request-based Intern Post Desk no longer appears in the main dashboard navigation.

## F. Validate existing functionality

- Main Requests dashboard and archived requests
- Statistics, Request SDG Explorer
- Form availability toggle
- Meta monthly CSV importer
- Request status management, email and Google Chat notifications (test with care on a non-critical record)

### Troubleshooting

| Message or behavior | Check |
|---|---|
| `Missing Dashboard API_URL` | `config.js` points to the deployed Dashboard `/exec` URL |
| `Invalid API action` | Backend `.gs` was not redeployed to a new version |
| `Incorrect access code` | Dashboard Apps Script project Script Properties; do not use Form/Tracker properties |
| `Column N is already in use` | Back up the monitoring Sheet and inspect `N3`; this update refuses to overwrite existing data |
| Queue looks unchanged after Move to end | Wait for save confirmation, then reload; only untagged posts are queued and moved items stay behind untouched posts |
| Preview is empty or blocked | Facebook disallows embeds for some posts; use **Open original** |
| Main Dashboard doesn't load | Confirm the actual MCR `SPREADSHEET_ID`/`SHEET_NAME` were copied to the new `Dashboard.gs` and `config.js` kept the correct URL |

**No Google Sheet modifications were performed by creating this package.** The one new column header will be added by the live backend only when you first open the Tagging Desk after deployment.
