# OSC Dashboard v1.6.3.1 — Tagging Desk Button Hotfix

This is a **frontend-only bug fix** based on the complete v1.6.3 project. The complete package includes all the existing GitHub frontend files, unchanged `apps-script/Dashboard.gs` for reference, plus this fix.

## What was broken

During Save or Move to End, the code set a `busy` flag and rendered the next post with the **Previous** and **Move to End** buttons disabled. When the request finished, it cleared `busy`, but only restored the card’s Save button. The two navigation buttons stayed disabled until a full browser refresh.

## What changed

`post-sdg-desk.js` now centralizes button enabled/disabled state in `syncControls()`, so all navigation buttons re-enable in the `finally` cleanup after a successful or failed asynchronous operation. This also handles an empty queue correctly.

Updated display version to v1.6.3.1 in `post-sdg-desk.html` and `config.js` (API URL kept unchanged from the v1.6.3 package).

## Installation — easiest way

1. In your GitHub repository `panpacificu/osc-dashboard`, replace **only** root-level `post-sdg-desk.js` from this ZIP (all other existing files can stay).
2. Commit your change.
3. Reload `https://panpacificu.github.io/osc-dashboard/post-sdg-desk.html` with **Ctrl+Shift+R**.
4. Test Move to End → Previous → Move to End again, then Save → Previous → Move to End. None should require a manual refresh.

Optional: also upload `post-sdg-desk.html` and `config.js` to show `v1.6.3.1` in page footer/changelog. **Before replacing config.js, verify that its API_URL equals your current working deployment URL. Keep your live config.js if you are unsure.**

## Important safety

- This fix is **frontend-only**. **Do NOT redeploy `Dashboard.gs`** or change Script Properties/Sheets.
- No changes to Form.gs or Tracker.gs.
- A full repository replacement package is provided for convenience; if your live site has newer local modifications, install the single JS file instead.
- No live Google Sheets were edited during this patch.

## Technical note

Only `post-sdg-desk.js`, `post-sdg-desk.html`, `config.js`, and this README differ from the v1.6.3 package.
