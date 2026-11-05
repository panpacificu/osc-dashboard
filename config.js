/****************************************************
 * OSC DASHBOARD CONFIG
 * Edit this file only for quick dashboard settings.
 ****************************************************/

window.OSC_DASHBOARD_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbx95aSPGw_UHjT6zgXaJ515rG4Su4l4gjAuZl0qkf3keOBop7AmRdTtcphkbjMpVa2iiA/exec',

  APP_VERSION: 'v1.6.1',

  LAST_UPDATED: 'November 5, 2026 — Monthly CSV Import and SDG Tagging Desk',

  CHANGELOG: [
    {version:'v1.6.1',date:'November 5, 2026',title:'Meta CSV Compatibility',changes:['Recognizes Meta Publish time, Title, and Permalink fields automatically.','Previews October posts using the actual publish date instead of the Lifetime insights column.','Summarizes long Meta captions and imports in short batches.']},
    {version:'v1.6.0',date:'November 5, 2026',title:'Monthly CSV Import and SDG Tagging Desk',changes:['Connected to the existing PU FB Page Posts Monitoring Sheet.','Added CSV preview and column mapping.','Added dedicated intern SDG tagging desk.','Retained previous request-based intern Post Desk and all request management functions.']},
    { version: 'v1.5.0', date: 'November 5, 2026', title: 'SDG Explorer and Intern Post Desk', changes: ['Separated SDG filtering from Statistics.', 'Simplified SDG result cards.', 'Added intern-only post queue with swipe and table views.'] },
    {
      version: 'v1.4.0',
      date: 'November 5, 2026',
      title: 'Statistics, SDGs and Facebook Post Links',
      changes: [
        'Moved Admin Statistics into a full Statistics and SDG filtering page.',
        'Added all 17 SDGs with multi-select intersection filtering.',
        'Added the Facebook Post Link Log for published posts.',
        'Updated the dashboard footer and retained Archive / Restore workflows.'
      ]
    },
    {
      version: 'v1.3.9',
      date: 'August 18, 2026',
      title: 'Compact UI and Archive Requests',
      changes: [
        'Made the dashboard UI more compact with smaller typography, tighter cards, and denser table spacing.',
        'Added Archive / Restore request actions.',
        'Archived requests are hidden from normal views by default.',
        'Added an Admin Statistics button to view hidden/archived requests.',
        'Kept Student request green row highlighting.'
      ]
    },
    {
      version: 'v1.3.7-final',
      date: 'July 09, 2026',
      title: 'Final Dashboard API URL Fix',
      changes: [
        'Corrected config.js to use the verified Dashboard backend URL for getRequests, getFormStatus, updateRequest, and markCompleted.',
        'Kept the green Student row highlight update.'
      ]
    },
    {
      version: 'v1.3.7',
      date: 'July 09, 2026',
      title: 'Student Row Highlight Hotfix',
      changes: [
        'Added subtle green row highlighting for requests marked as Student.',
        'Added a Student Request label below the requester name.',
        'Added Requester Type, Adviser Name, and Adviser Email to dashboard search/detail support when present in the sheet.',
        'Included the mobile entry modal CSS hotfix as an extra file for the Request Form.'
      ]
    },
    {
      version: 'v1.3.6',
      date: 'June 22, 2026',
      title: 'Form Availability and Notification Updates',
      changes: [
        'Added a request form availability toggle inside Admin Statistics.',
        'Added a customizable message shown when the request form is closed.',
        'Added Google Chat notification cards for newly received requests.',
        'Updated completion cards to link only to the OSC Dashboard.',
        'Changed email headers to a solid Panpacific University blue.'
      ]
    },
    {
      version: 'v1.3.3',
      date: 'June 21, 2026',
      title: 'Floating Controls and Changelog',
      changes: [
        'Moved Refresh to a floating button above Admin Statistics.',
        'Removed the Refresh button from the dashboard header.',
        'Added a left-side Changelog button and slide-out drawer.',
        'Kept the controls lightweight with no additional icon library.'
      ]
    },
    {
      version: 'v1.3.2',
      date: 'June 21, 2026',
      title: 'Admin Statistics Sidebar',
      changes: [
        'Changed Admin Statistics from a floating card to a right-side drawer.',
        'Reduced unnecessary rendering and heavy visual effects.',
        'Added search input debounce for smoother filtering.'
      ]
    },
    {
      version: 'v1.3.1',
      date: 'June 18, 2026',
      title: 'Configuration File',
      changes: [
        'Added config.js for the Apps Script API URL, version, timestamp, and editable settings.'
      ]
    },
    {
      version: 'v1.3.0',
      date: 'June 18, 2026',
      title: 'Dashboard Insights and Webhook',
      changes: [
        'Added Admin Statistics.',
        'Added optional completion webhook notifications.',
        'Added footer version and last-updated timestamp.'
      ]
    }
  ]
};
