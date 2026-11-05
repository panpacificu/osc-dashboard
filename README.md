# OSC Dashboard v1.6.3 — Persistent Tagging Queue & Facebook Post Database

**November 5, 2026** • Complete Panpacific University OSC Dashboard GitHub Pages repository and the corresponding Dashboard Apps Script backend.

## New in v1.6.3

- **SDG Tagging Desk (`post-sdg-desk.html`)**: replaced temporary Skip with a server-persisted **Move to end ↪** action. It writes an ISO timestamp in `Post Monitoring Log!N` and sorts untagged posts so deferred ones go last. The actual Sheet rows are **not moved, deleted, or archived**; this protects formulas in `SDG Summary & Grouping`. Repeated deferral sends a post to the back again, even after refreshing or reopening the browser.
- **Automatic queue refresh**: successful SDG/Core Value/title save reloads the pending queue from the actual Google Sheet, advances to the next post, and shows a success notification. Deferral does the same.
- **Facebook Post Database (`post-database.html`)**: read-only title/date/link search, month/SDG/Core Value filters, full preview and original Facebook link. Displays both tagged and untagged posts; draws directly from the Post Monitoring Log. Open with `OSC_INTERN_LINK_PIN` **or** `OSC_POST_IMPORT_PIN`.
- **Paused legacy Intern Post Desk**: `facebook-posts.html` is now an informational page, not the link submission workflow. The old Intern Post Desk is removed from management navigation and its old JS/CSS are not shipped. Legacy request-based desk endpoints now return a paused message; their underlying functions remain for future reactivation.
- Updated version and menu links across the dashboard and statistics/SDG pages.

## Important: one new Sheet header

Upon opening the Tagging Desk after installing the new backend, the app adds this header to **N3** of your existing **Post Monitoring Log** (only if N3 is empty):

`Tagging Queue Deferred At`

Deferral timestamps are saved in column N. If N3 is occupied by something else, the backend refuses to overwrite it and displays an error. **Columns B–M, the existing SDG/Core Values, and the `SDG Summary & Grouping` tab remain unchanged.**

**No manual Sheet edits are required.** Back up the monitoring Sheet before the upgrade.

## Files to upload to GitHub Pages

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `script.js` | Core MCR Dashboard |
| `config.js` | Existing live Dashboard API URL and changelog (verify before deploying) |
| `statistics.html`, `statistics.js`, `workspace.css` | Management statistics |
| `sdg.html`, `sdg.js`, `explorer.css` | MCR SDG explorer |
| `import-posts.html`, `import-posts.js`, `post-monitoring.css` | Meta monthly CSV import and shared intern styles |
| `post-sdg-desk.html`, `post-sdg-desk.js`, `post-sdg-desk.css` | Intern SDG tagging and persistent queue |
| `post-database.html`, `post-database.js`, `post-database.css` | Searchable FB post library |
| `facebook-posts.html` | Paused legacy Intern Post Desk notice (overwrites prior active page) |
| `.nojekyll` | GitHub Pages configuration |

**Never copy `apps-script/Dashboard.gs` into the GitHub root as frontend code.** Deploy it in the existing standalone Dashboard Apps Script project; the folder is included as a reference and source file.

The legacy `facebook-posts.js` and `intern.css` are intentionally omitted from this release. You may delete those unused files from GitHub later. Keeping them does not re-enable the paused page.

## Backend configuration

Before replacing `Dashboard.gs`, carry forward the **working MCR spreadsheet ID**, its exact `SHEET_NAME`, your existing staff/webhook settings, and any local customizations. This sample retains a placeholder for `CONFIG.SPREADSHEET_ID`; **deploying it unchanged would break the core Dashboard**.

The Facebook monitoring Sheet is already configured as `1z3iOYk_ODNrrlyZXKCwNk1i14OIFmYHbV2fgsv2-r-I` and tab `Post Monitoring Log`.

Properties in the **Dashboard Apps Script** project:

- `OSC_INTERN_LINK_PIN`: existing intern code. Required for the tagging and deferral workflows; also accepted in the Post Database.
- `OSC_POST_IMPORT_PIN`: existing staff import code. Required for Meta CSV import; also accepted in the Post Database.
- `OSC_CHAT_WEBHOOK_URL`: preserve if used.

**Do not disclose codes, change `config.js`'s `API_URL` without verifying, or create a New deployment.** In Manage deployments, edit the **existing** Dashboard deployment and select **New version**.

## Manual checks after installation

1. Run `testDashboardConnection` and `testMonitoringConnection` in the Dashboard Apps Script editor.
2. Update the **existing** Dashboard Web App deployment to a new version. Verify `config.js` points to it.
3. Open `post-sdg-desk.html` and use the existing intern code. Choose an untagged post, press **Move to end**, then browser-refresh: it should remain behind the untouched posts.
4. Tag one post (title, at least one SDG, at least one Core Value). Save; see the success notification and automatically refreshed queue.
5. Open `post-database.html` with intern/import code. Search the saved title, verify the post date, SDG(s), Core Value(s), and original Facebook link. If the Facebook embed isn't supported, use **Open original**.
6. Verify the main Dashboard, Statistics, SDG Explorer and monthly import pages still load.
7. `facebook-posts.html` should show only a **paused** notice. There should be **no** Intern Post Desk link in management navigation.

**Security note**: The database and intern endpoints use the existing PIN-based Apps Script JSONP pattern. This is a basic access gate, not true user/role authentication. GitHub Pages page URLs remain public; a future authenticated backend is recommended for sensitive admin actions.

See `INSTALL-v1.6.3.md` for detailed instructions and safety notes.
