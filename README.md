# OSC Dashboard v1.6.1 — Complete First-Install Package

This package can be installed **directly from v1.5.0** (or an older working version). You do NOT have to deploy v1.6.0 first.

## Contents and where they belong

- The HTML, CSS, JS, and `.nojekyll` files in this folder are the **GitHub Pages frontend**. Upload them to the repository ROOT (not in an extra nested directory).
- `config.js` is required. **Check its `API_URL` against your live Dashboard Apps Script deployment**; it is a last-known historical value, not live-verified.
- `apps-script/Dashboard.gs` is the **Google Apps Script backend**, and must be installed separately in the existing Dashboard Apps Script project.
- `INSTALL-FIRST-v1.6.1.md` contains a step-by-step walkthrough for a first-time v1.6.1 install.
- `PRE-FLIGHT-CHECKLIST.txt` is a quick safety checklist.

## Features

1. Existing Dashboard, request management, archive/restore, form toggle, email/webhooks remain.
2. Statistics and SDG Explorer remain separate pages.
3. Existing request-based Facebook Post Desk remains.
4. **Monthly CSV Import** (`import-posts.html`): Meta `Publish time` → date, `Title` → concise caption summary, `Permalink` → Facebook URL.
5. **Post SDG Tagging Desk** (`post-sdg-desk.html`): interns tag published posts in the existing monitoring workbook, SDG 1–17, up to 5 goals per post, optional core values.

## Data destinations

- MCR Request database: your existing spreadsheet configured as `CONFIG.SPREADSHEET_ID` in `Dashboard.gs` (this package intentionally has a placeholder for that value).
- Facebook Post Monitoring workbook: existing sheet ID `1z3iOYk_ODNrrlyZXKCwNk1i14OIFmYHbV2fgsv2-r-I`, tab **Post Monitoring Log**, columns B–M, header row 3.
- Sheet **SDG Summary & Grouping** remains untouched by imports and tagging.

## October CSV

The uploaded October Meta CSV has 75 post records (50 photos and 25 videos); the mapping test found all 75 structurally valid, but **some may already exist in the Google Sheet under different Facebook URL variants**. Preview and compare dates/titles before importing. The source CSV is not bundled with this code ZIP.

## Important limitations

- This uses Google Apps Script GET/JSONP with shared PINs; PINs are sent in URLs and are not full authentication. Restrict distribution and plan authenticated access later.
- Importer checks duplicate normalized URL strings; it cannot guarantee detection of an older `facebook.com/share/p/...` URL that points to the same post as a newer Meta permalink.
- Changing GitHub files does not publish the Apps Script code; changing Apps Script code does not upload the GitHub files. Deploy both in order.

---

## Existing implementation notes

# OSC Dashboard v1.6.1 — Meta CSV Mapping Fix & SDG Tagging Desk

**Complete GitHub Pages repository + updated Dashboard Apps Script source.**

This release does **not** modify your live Google Sheet by itself. Your Sheet is changed only when you explicitly run the monthly CSV import or an intern saves SDGs after deployment.

## Existing workbook (preserved)

- **Workbook:** [PU FB Page Posts Monitoring Sheet 2026](https://docs.google.com/spreadsheets/d/1z3iOYk_ODNrrlyZXKCwNk1i14OIFmYHbV2fgsv2-r-I/edit)
- **Data tab:** `Post Monitoring Log`
- **Header row:** 3
- **B:** Post Date
- **C:** Post Topic / Caption Summary
- **D:** Facebook Post URL
- **E–I:** Primary SDG through SDG 5 (five SDG slots)
- **J–M:** Primary Core Value through Core Value 4
- **Summary tab:** `SDG Summary & Grouping` — left unchanged, including existing formulas.

The MCR request database is still separate. No request data is copied into the Post Monitoring Log automatically; the monthly Meta CSV is the source for published posts.

## New pages

### `import-posts.html` — OSC staff only

1. Select a monthly CSV/TSV export from Meta.
2. Choose date, caption/title, and published Facebook post URL columns.
3. Select `MM/DD/YYYY` or `DD/MM/YYYY` interpretation for ambiguous dates.
4. Preview how records will be imported. Invalid URLs/dates and duplicate URLs within the CSV are excluded.
5. Enter `OSC_POST_IMPORT_PIN` and confirm **Import new posts**.
6. Server-side duplicate checking skips any Facebook URLs already in the monitoring log.
7. New rows receive dates, titles and links in B–D; E–M stay untagged for interns. The existing dropdown validation and row formatting are copied from row 4.

**Validated against the uploaded October 2026 Meta export:** 75 posts, with `Publish time`, `Title`, and `Permalink` as the correct fields. This page supports manual column mapping, but the first real import should be previewed/tested with the sample CSV before a production upload. Only full HTTPS Facebook or fb.watch URLs are accepted. An export with no post URL cannot be imported safely without a matching strategy.

### `post-sdg-desk.html` — Intern SDG Tagging Desk

- Uses your **existing** `OSC_INTERN_LINK_PIN`.
- Displays only monitoring rows with Facebook URLs **and no SDGs in columns E–I**.
- Minimal cards with post date/title/URL, plus selectable SDG 1–17 chips.
- Select one to five goals per post; the existing Sheet has only five SDG columns.
- Optional Core Values are available in a collapsible section (up to four values).
- Saving writes to the same Google Sheet, protects already-tagged rows against accidental overwrites and moves to the next post.
- Supports swipe left to skip / right to save, plus an optional table view to select posts to tag.
- Intern view has **no Dashboard/Statistics navigation**.

### Existing pages stay intact

`index.html`, `statistics.html`, `sdg.html`, and `facebook-posts.html` from v1.5.0 remain. The old request-based Post Desk is unchanged, so no existing request-link workflow is interrupted.

## Files included

Upload every top-level frontend file to the root of `panpacificu/osc-dashboard`:

```
index.html
statistics.html
sdg.html
facebook-posts.html
import-posts.html
post-sdg-desk.html
script.js
statistics.js
sdg.js
facebook-posts.js
import-posts.js
post-sdg-desk.js
style.css
workspace.css
explorer.css
intern.css
post-monitoring.css
config.js
.nojekyll
README.md
```

`apps-script/Dashboard.gs` is a **source copy for the separate Apps Script editor**, not a GitHub Pages backend executable.

## Safe deployment order

1. **Backup the current production Dashboard.gs** from Apps Script and download a backup copy of your post-monitoring Google Sheet.
2. Open the existing **Dashboard Apps Script project**, not the Form or Tracker project.
3. Replace its Dashboard.gs with `apps-script/Dashboard.gs`, preserving your **correct MCR `CONFIG.SPREADSHEET_ID`**, Sheet tab name, staff settings, and any other local customizations. The package contains a placeholder MCR Sheet ID.
4. In **Project Settings → Script Properties**, keep `OSC_CHAT_WEBHOOK_URL` and existing `OSC_INTERN_LINK_PIN` as they are. Add a separate new property: `OSC_POST_IMPORT_PIN` with a distinct code **not placed in the frontend files**.
5. Run `testDashboardConnection` and `testMonitoringConnection` manually. Both tests only read Sheets. Run `testInternDeskQueue` if needed; it checks the old request-based desk.
6. **Deploy → Manage deployments → edit the currently used Dashboard deployment → New version → Deploy.** Do not create a different `/exec` URL.
7. Verify the `API_URL` in `config.js` against the actual production Dashboard deployment. This package preserves the previous config value, which may be outdated if you changed deployments. Both `?action=getRequests` and `?action=getFormStatus` must work.
8. Upload all frontend files into the GitHub repository **root**, commit, and hard refresh GitHub Pages.
9. Test `post-sdg-desk.html` with the intern PIN. It may show no pending posts until you import a fresh CSV.
10. On a **small test CSV**, use `import-posts.html` to preview, then test actual import and confirm the new rows in the monitoring Sheet. Re-importing the same CSV should add zero duplicates.

## Internal backend actions added

- `getMonitoringTagQueue` — read untagged published posts (existing intern PIN)
- `saveMonitoringTags` — save up to five SDGs and optional core values (existing intern PIN)
- `importMonitoringPosts` — batch-import new published posts (separate admin import PIN)
- `testMonitoringConnection` — read-only configuration/Sheet check in Apps Script editor

Old request update, archiving, form-status, emails, webhook and request-based intern post-link routes remain.

## Practical constraints

- **Validated against October 2026 sample.** Later Meta exports may change format. Do not run a full live import until the mapping has been verified against one real export.
- The existing monitoring Sheet only has **five SDG columns**. Extend the Sheet schema and summary formulas as a separate project if you need more than five SDGs on a single published post.
- This uses the current Apps Script JSONP transport and shared PINs. It is basic access gating, **not secure authenticated admin access**. Codes are sent in requests and could be observed. True access restrictions require an authenticated backend and server-side roles.
- Some Meta CSVs contain engagement insights rather than a list of posts. This importer handles *post rows with published dates, titles/captions, and Facebook URLs*; other exports need an adjusted mapping.
- No existing monitoring entries, dropdown choices or summary formulas are overwritten by import; SDG saves only target untagged posts.
- No automatic monthly scheduling, Facebook API sync, or generated PDF reports in this version.

## Update date

November 5, 2026 — release v1.6.0


## v1.6.1 — October Meta CSV verification (November 5, 2026)

Sample received: `Oct-01-2026_Oct-31-2026_1843702146652459.csv`.

- 75 records: 50 Photos, 25 Videos; 75 unique nonempty Facebook `Permalink` URLs.
- The actual publication date comes from `Publish time`, formatted `MM/DD/YYYY HH:MM`.
- The separate `Date` field is **Lifetime** on every row and must NOT be mapped as Post Date.
- `Title` contains the full post caption; the importer now extracts its first nonempty line (max ~160 characters) for the concise Post Topic / Caption Summary.
- Preview first and check dates, titles and links before confirming live import.
- The existing Sheet sometimes has `facebook.com/share/p/...` URLs while Meta provides `facebook.com/panpacificu/posts/pfbid...`. These may be different URLs for the SAME post; raw URL de-duplication cannot always spot this. Review overlapping dates and titles to prevent unintended duplicates.
- 75 posts passed format checks; this does **not** mean 75 new records should be inserted. Some may already exist in the monitoring Sheet under different URLs.
- `import-posts.js` now batches three posts per call, within the backend's limit of three.

**Deployment for this mapping fix:** Replace the GitHub Pages frontend file `import-posts.js` (and the updated `import-posts.html` if desired). The Apps Script code is unchanged from v1.6.0, so **no Apps Script redeployment is needed solely for this Meta mapping fix**. Keep your verified existing `config.js` URL; this complete ZIP includes a copy from v1.6.0 that should be checked before replacing a working configuration.

**No live data was imported or changed during validation.**
