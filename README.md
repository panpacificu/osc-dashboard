# OSC Dashboard Latest Package v1.3.7

This package contains the latest OSC Dashboard frontend files plus the current Dashboard Apps Script backend.

## Replace these files in the OSC Dashboard GitHub repository

- `index.html`
- `style.css`
- `script.js`
- `config.js`
- `README.md`

## Apps Script backend

The current Dashboard backend is included here:

- `apps-script/Dashboard.gs`

Use it only if you need to restore or update the Dashboard Apps Script project.

## Included dashboard update

### Student row highlight

Rows will automatically turn subtly green when the spreadsheet contains:

`Requester Type = Student`

Older rows will highlight after refresh if that column already contains `Student`.

The update also adds a small `Student Request` label under the requester name.

## Extra file

The request form mobile modal hotfix is included as an extra:

- `extras/request-form-mobile-modal-hotfix.css`

This is not a dashboard file. Append it to the bottom of the Request Form repository's `style.css` only if needed.

## Deployment notes

For dashboard frontend changes:

1. Replace the GitHub files.
2. Commit.
3. Wait for GitHub Pages to publish.
4. Hard refresh with Ctrl + F5.

For Apps Script backend changes:

1. Replace the Dashboard Apps Script code with `apps-script/Dashboard.gs`.
2. Run `testDashboardConnection`.
3. Update the existing deployment to a New version.
4. Keep the same `/exec` URL.

## Current versions

- Dashboard frontend package: v1.3.7
- Dashboard backend: v1.3.7
- Tracker backend remains separate.
- Request Form backend remains separate.
