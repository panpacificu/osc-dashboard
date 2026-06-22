/****************************************************
 * OSC DASHBOARD CONFIG
 * Edit this file only for quick dashboard settings.
 ****************************************************/

window.OSC_DASHBOARD_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbx95aSPGw_UHjT6zgXaJ515rG4Su4l4gjAuZl0qkf3keOBop7AmRdTtcphkbjMpVa2iiA/exec',

  APP_VERSION: 'v1.3.6',

  LAST_UPDATED: 'June 22, 2026',

  CHANGELOG: [
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
