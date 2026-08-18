# OSC Dashboard v1.3.9 — Compact UI + Archive Requests

This update adds a more compact Dashboard interface and a new Archive / Restore request workflow.

## Included replacement files

Replace these files in the OSC Dashboard GitHub repository:

- `index.html`
- `script.js`
- `style.css`

Keep your current working `config.js`.

A sample config is included only as:

- `config.sample.js`

Do not overwrite your existing `config.js` unless you manually copy your current verified Dashboard Apps Script URL into it first.

## Apps Script update required

This feature requires a Dashboard Apps Script backend update because archive status must be saved to the Google Sheet.

Replace your Dashboard Apps Script code with:

- `apps-script/Dashboard.gs`

Before deploying, make sure your current values are preserved:

```javascript
SPREADSHEET_ID: 'YOUR_CURRENT_SPREADSHEET_ID',
SHEET_NAME: 'Form Responses'
```

Then run:

1. `testDashboardConnection`
2. `authorizeDashboardPermissions`

Deploy by updating the existing Dashboard Web App deployment:

1. Deploy
2. Manage deployments
3. Select the current Dashboard deployment
4. Edit
5. Version: New version
6. Deploy

Do not create a new Web App URL.

## New archive workflow

- Open any request.
- Click `Archive Request`.
- The request is hidden from Open, All, Completed, and Unassigned views.
- Open Admin Statistics.
- Click `Show Archived`.
- Open an archived request and click `Restore Request`.

The backend automatically creates a new spreadsheet column named:

`Archived`

Archived requests use:

`Archived = Yes`

Restored requests clear the `Archived` value.

## Compact UI changes

- Smaller header typography.
- Tighter summary cards.
- Denser tables.
- Smaller badges and action buttons.
- More compact modal and admin side drawer.

## Student row highlight

The previous Student row highlight remains active when:

`Requester Type = Student`

## Test checklist

1. Dashboard still loads requests.
2. Open/assign still sends email and webhook.
3. Mark completed still sends email and webhook.
4. Archive a test request.
5. Confirm it disappears from normal views.
6. Admin Statistics → Show Archived.
7. Restore the test request.
8. Confirm it reappears in normal views.
