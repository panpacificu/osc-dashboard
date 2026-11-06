# OSC Dashboard v1.6.4 — Step-by-Step Update

You can update directly from v1.6.3.1. This is a **backend and frontend** release, not only a display change.

## 1 — Back up

1. Download or copy your **working Dashboard.gs**, **GitHub config.js**, and the **PU FB Page Posts Monitoring Sheet** (File → Make a copy).
2. Keep your existing standalone **Form.gs** and **Tracker.gs** projects untouched.

## 2 — Update the Dashboard Apps Script (not the Form or Tracker Apps Script)

1. Open the existing OSC Dashboard Apps Script project.
2. Open this ZIP's `apps-script/Dashboard.gs` and replace the project's `Dashboard.gs` code.
3. **CRITICAL:** Its `CONFIG.SPREADSHEET_ID` is a placeholder (`PASTE_YOUR_SPREADSHEET_ID_HERE`). Replace it with the actual **MCR request** spreadsheet ID from your previous working `Dashboard.gs`. Preserve `CONFIG.SHEET_NAME` if the live tab is named differently.
4. The **monitoring** spreadsheet ID is separately configured under `MONITORING_CONFIG.SPREADSHEET_ID` and points to your existing `PU FB Page Posts Monitoring Sheet 2026`.
5. Keep your existing script properties (`OSC_INTERN_LINK_PIN`, `OSC_POST_IMPORT_PIN`, and `OSC_CHAT_WEBHOOK_URL` where used) in this SAME Dashboard Apps Script project. There is **no new PIN** in v1.6.4.
6. Save and run `testDashboardConnection` and `testMonitoringConnection` once. Confirm both succeed.

## 3 — Upgrade the Google Sheet summary formulas (one time)

1. After backing up the workbook, in the **Dashboard Apps Script editor**, choose `upgradeMonitoringSummaryForAllSdgs` and click Run.
2. This checks that the expected monitoring Sheet and summary layout are present; it adds header **`Additional SDGs` in O3** (without shifting columns), creates a hidden backup tab called **`SDG Summary Backup v1.6.4`**, and updates counts/groupings in the existing **SDG Summary & Grouping** tab.
3. The updated summary counts the SDGs in **E:I plus O** and uses open-ended row ranges, so it can include monthly CSV imports beyond row 69.
4. Check **B4** (total posts), **D9:D25** (all 17 SDG counts), **J8** (matching selected SDG), and **G10** (filtered posts). Core Value grouping **Q8** and **M10** also updates to include rows beyond 69.
5. If the function reports a changed/unexpected layout, **stop and inspect** the existing formulas; it is designed to refuse changes in that case rather than overwrite customizations.

**Do not insert additional SDG columns between I and J.** Columns **J:M** must remain Core Values and **N** stays the deferred queue marker. **O** stores all goals after the fifth (up to 12).

## 4 — Update your EXISTING Dashboard Web App deployment

1. Apps Script → Deploy → Manage deployments.
2. Select the current working **Dashboard** Web App deployment → Edit → select **New version** → Deploy.
3. **Do not choose New deployment**. Reusing the same deployment preserves its `/exec` URL.

## 5 — Upload the GitHub frontend

1. Inspect `config.js` from this ZIP. It includes a prior known API_URL; your current working URL is authoritative. If different, copy your live **config.js** back before upload.
2. Upload the files into the **root** of `panpacificu/osc-dashboard` on the `main` branch, keeping `index.html`, `post-sdg-desk.js`, and `config.js` at the top level. The `apps-script` folder is a source backup only.
3. Commit and hard-refresh the site using Ctrl + Shift + R.

## 6 — Test one untagged post

1. Open `https://panpacificu.github.io/osc-dashboard/post-sdg-desk.html` and enter the existing intern PIN.
2. Confirm **Select all 17 SDGs** selects every colored tile. Click the same button again to deselect. Try selecting six manually.
3. Set at least one **Core Value** and save an **untagged** test post. It should automatically load the next post, keeping Previous and Move to End clickable.
4. In the monitoring Sheet, verify **E:I** contain the first five selected goals, **O** contains any remaining goals, **J:M** Core Values are unchanged, and **N** remains the defer column.
5. Open `post-database.html`, search for the saved post and confirm all SDGs appear and filters find a goal saved in column O.
6. Verify the refreshed **SDG Summary & Grouping** counts include those extra goals.

### Notes

- Earlier already-tagged records remain tagged and are not reopened by this release. Edit them manually in Sheets if corrections are necessary; do **not** overwrite other SDG/Core Value columns.
- The legacy **Intern Post Desk** remains paused.
- No changes required for Request Form and Request Tracker Apps Script projects.
- Facebook previews depend on Facebook's external embed permissions.
