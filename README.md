# OSC Dashboard v1.6.4 — All 17 SDGs + Select All

**Full GitHub repository + Dashboard Apps Script source.** This release builds on v1.6.3.1 and preserves the button-state hotfix, persistent Move to End, Facebook Post Database, monthly Meta CSV Import, SDG Explorer, request Dashboard, Statistics, archives, emails, and existing scripts.

## What's new

- The SDG Tagging Desk accepts **any 1–17 SDGs**. Use **Select all 17 SDGs** (click again to deselect) or clear the selection. Keep the colored illustrated goal buttons and required Core Values.
- Existing monitoring Sheet columns are preserved: **E:I** contain the first five selected SDGs; **J:M** contain the four Core Values; **N** remains the persistent queue marker; **O** is the new `Additional SDGs` column for selections 6–17.
- Saved posts leave the queue; Post Database search and filters include all selected SDGs, including those in column O.
- One-time Apps Script function `upgradeMonitoringSummaryForAllSdgs` updates the **SDG Summary & Grouping** formulas to count additional SDGs in O and future posts beyond row 69, plus remove the old row 69 limit from Core Value grouping. It makes a hidden copy of the original Summary tab first.

## Installation

**Read `INSTALL-v1.6.4.md` first.** Update the Dashboard Apps Script backend and the existing deployment; the frontend alone cannot save more than five SDGs. Preserve your actual `CONFIG.SPREADSHEET_ID` and `CONFIG.SHEET_NAME` and the existing production `config.js` API_URL.

### Safety / scope

- No live Google Sheet, GitHub repository, or Apps Script deployment has been modified by producing this package.
- Existing tagged posts do not automatically reappear in the pending Tagging Desk. Their existing five goals remain unchanged. If you need to revise older tagged posts, the monitoring Sheet can be edited manually, or a future edit-existing-post workflow can be added.
- The five original SDG columns and Core Values columns must **not** be moved. Do not add six new SDG columns between I and J.
- The original summary sheet's `Verified Posts` calculation was already independent of the SDG counting formulas; it is not changed in this release.
- `config.js` comes from the prior complete ZIP and its API_URL must be verified against your currently deployed Dashboard Web App URL. If your working config is different, **keep the live config.js**.

## Files

Frontend pages: `index.html`, `statistics.html`, `sdg.html`, `import-posts.html`, `post-sdg-desk.html`, `post-database.html`, and the paused `facebook-posts.html`, with all required JS/CSS/`config.js`/`.nojekyll`.

Backend: `apps-script/Dashboard.gs` (copy into the *Dashboard* Apps Script project, not GitHub-hosted as an API). Do not change `Form.gs` or `Tracker.gs`.
