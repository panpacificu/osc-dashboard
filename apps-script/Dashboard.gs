/****************************************************
 * OSC REQUEST MANAGEMENT DASHBOARD API
 * Backend: Google Apps Script
 * Frontend: GitHub Pages
 * Version: 1.6.4
 ****************************************************/

const CONFIG = {
  /**
   * Required for a standalone Apps Script project.
   * Copy the value between /d/ and /edit from the Google Sheet URL.
   *
   * Example:
   * https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
   */
  SPREADSHEET_ID: 'PASTE_YOUR_SPREADSHEET_ID_HERE',

  SHEET_NAME: 'Form Responses',
  DATE_FORMAT: 'yyyy-MM-dd',
  TIMEZONE: Session.getScriptTimeZone(),

  TRACKER_LINK: 'bit.ly/OSC-MCR-Tracker',
  FORM_LINK: 'bit.ly/OSC-MCR-Form',
  DASHBOARD_LINK: 'https://panpacificu.github.io/osc-dashboard/',

  DEFAULT_FORM_CLOSED_MESSAGE: 'We are not currently receiving requests as of now. Please check back later or contact the Office of Strategic Communications for assistance.',

  /**
   * Optional chat webhook.
   * Leave blank to disable chat notifications.
   *
   * Supported values for CHAT_WEBHOOK_PLATFORM:
   * 'google_chat', 'slack', 'discord', 'teams'
   */
  /**
   * Store the webhook securely in:
   * Apps Script → Project Settings → Script properties
   *
   * Property:
   * OSC_CHAT_WEBHOOK_URL = your Google Chat webhook URL
   */
  CHAT_WEBHOOK_PROPERTY: 'OSC_CHAT_WEBHOOK_URL',
  CHAT_WEBHOOK_PLATFORM: 'google_chat'
};

const STAFF_PROFILES = {
  'Jann Nathaniel Jaravata': {
    displayName: 'Jann Nathaniel Jaravata',
    email: 'jaravata.nathan@panpacificu.edu.ph',
    signatureFileId: ''
  },

  'Jhovhert Bogtong': {
    displayName: 'Jhovhert Bogtong',
    email: 'bogtong.jhovert@panpacificu.edu.ph',
    signatureFileId: ''
  },

  'Julius Benedict Ignacio': {
    displayName: 'Julius Benedict Ignacio',
    email: 'ignacio.juliusbenedict@panpacificu.edu.ph',
    signatureFileId: ''
  },

  'Charlyn Libao': {
    displayName: 'Charlyn Libao',
    email: 'libao.charlyn@panpacificu.edu.ph',
    signatureFileId: ''
  }
};

/**
 * Default CC recipients for both opening and closing emails.
 * The assigned staff email will be added automatically.
 */
const DEFAULT_EMAIL_CC = [
  'marketing.staff@panpacificu.edu.ph',
  'stratcomm@panpacificu.edu.ph'
];

const FORM_STATUS_KEYS = {
  ENABLED: 'OSC_FORM_ENABLED',
  MESSAGE: 'OSC_FORM_CLOSED_MESSAGE',
  UPDATED_AT: 'OSC_FORM_STATUS_UPDATED_AT'
};

/****************************************************
 * API ENDPOINTS
 ****************************************************/

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || 'getRequests';
    const callback = params.callback || '';

    let result;

    switch (action) {
      case 'getRequests':
        result = getRequests_();
        break;

      case 'getSummary':
        result = getDashboardSummary_();
        break;

      case 'updateRequest':
        result = updateRequestFromParams_(params);
        break;

      case 'markCompleted':
        result = markRequestCompleted_(params.rowNumber);
        break;

      case 'addFacebookPostLinks':
        result = addFacebookPostLinks_(params);
        break;

      case 'getMonitoringPostDatabase':
        result = getMonitoringPostDatabase_(params.pin);
        break;

      case 'deferMonitoringPost':
        result = deferMonitoringPost_(params);
        break;

      case 'getMonitoringTagQueue':
        result = getMonitoringTagQueue_(params.pin);
        break;

      case 'saveMonitoringTags':
        result = saveMonitoringTags_(params);
        break;

      case 'importMonitoringPosts':
        result = importMonitoringPosts_(params);
        break;

      case 'getPostingQueue':
        result = {success:false,message:'The legacy Intern Post Desk is paused. Please use the Facebook Post Database or SDG Tagging Desk.'};
        break;

      case 'saveInternPostLink':
        result = {success:false,message:'The legacy Intern Post Desk is paused. Please use the Facebook Post Database or SDG Tagging Desk.'};
        break;

      case 'archiveRequest':
        result = setRequestArchived_(params.rowNumber, true);
        break;

      case 'unarchiveRequest':
        result = setRequestArchived_(params.rowNumber, false);
        break;

      case 'assignRequest':
        result = assignRequest_(params.rowNumber, params.assignedTo);
        break;

      case 'updateStatus':
        result = updateRequestStatus_(params.rowNumber, params.status);
        break;

      case 'getFormStatus':
        result = getFormStatus_();
        break;

      case 'setFormStatus':
        result = setFormStatus_(params.enabled, params.message);
        break;

      default:
        result = {
          success: false,
          message: 'Invalid API action.'
        };
    }

    return createResponse_(result, callback);

  } catch (error) {
    return createResponse_({
      success: false,
      message: error.message
    }, e && e.parameter && e.parameter.callback ? e.parameter.callback : '');
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || '';

    let result;

    switch (action) {
      case 'updateRequest':
        result = updateRequest_(body);
        break;

      case 'markCompleted':
        result = markRequestCompleted_(body.rowNumber);
        break;

      case 'addFacebookPostLinks':
        result = addFacebookPostLinks_(body);
        break;

      case 'deferMonitoringPost':
        result = deferMonitoringPost_(body);
        break;

      case 'saveMonitoringTags':
        result = saveMonitoringTags_(body);
        break;

      case 'importMonitoringPosts':
        result = importMonitoringPosts_(body);
        break;

      case 'saveInternPostLink':
        result = {success:false,message:'The legacy Intern Post Desk is paused. Please use the Facebook Post Database or SDG Tagging Desk.'};
        break;

      case 'archiveRequest':
        result = setRequestArchived_(body.rowNumber, true);
        break;

      case 'unarchiveRequest':
        result = setRequestArchived_(body.rowNumber, false);
        break;

      case 'setFormStatus':
        result = setFormStatus_(body.enabled, body.message);
        break;

      default:
        result = {
          success: false,
          message: 'Invalid POST action.'
        };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/****************************************************
 * REQUEST DATA
 ****************************************************/

function getRequests_() {
  const sheet = getSheet_();
  ensureArchiveColumn_(sheet);
  ensureFacebookPostLinksColumn_(sheet);
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return {
      success: true,
      headers: data[0] || [],
      requests: []
    };
  }

  const headers = data[0].map(header => String(header).trim());
  const rows = data.slice(1);

  const requests = rows.map((row, index) => {
    const item = {};

    headers.forEach((header, colIndex) => {
      item[header] = formatCellValue_(row[colIndex], header);
    });

    item.rowNumber = index + 2;
    item.fullName = buildFullName_(item);
    item.requestDisplayTitle = getRequestTitle_(item);
    item.isOpen = isOpenRequest_(item);
    item.isCompleted = isCompletedRequest_(item);
    item.isUnassigned = isUnassignedRequest_(item);
    item.isOverdue = isOverdue_(item);
    item.isArchived = isArchivedRequest_(item);

    return item;
  });

  return {
    success: true,
    headers,
    requests
  };
}

function getDashboardSummary_() {
  const result = getRequests_();

  if (!result.success) {
    return result;
  }

  const requests = result.requests;
  const activeRequests = requests.filter(item => !item.isArchived);

  return {
    success: true,
    summary: {
      total: activeRequests.length,
      open: activeRequests.filter(item => item.isOpen).length,
      completed: activeRequests.filter(item => item.isCompleted).length,
      unassigned: activeRequests.filter(item => item.isUnassigned).length,
      overdue: activeRequests.filter(item => item.isOverdue).length,
      archived: requests.filter(item => item.isArchived).length
    }
  };
}

/****************************************************
 * UPDATE REQUESTS
 ****************************************************/

function updateRequestFromParams_(params) {
  if (!params.rowNumber) {
    throw new Error('Missing row number.');
  }

  let updates = {};

  if (params.updates) {
    updates = JSON.parse(params.updates);
  }

  return updateRequest_({
    rowNumber: params.rowNumber,
    updates
  });
}

function updateRequest_(payload) {
  if (!payload || !payload.rowNumber) {
    throw new Error('Missing row number.');
  }

  const sheet = getSheet_();
  ensureArchiveColumn_(sheet);
  const headers = getHeaders_(sheet);
  const rowNumber = Number(payload.rowNumber);
  const updates = payload.updates || {};

  if (rowNumber < 2) {
    throw new Error('Invalid row number.');
  }

  const oldItem = getRowObject_(sheet, headers, rowNumber);

  const oldTicket = normalize_(oldItem['Ticket']);
  const newTicket = normalize_(
    Object.prototype.hasOwnProperty.call(updates, 'Ticket')
      ? updates['Ticket']
      : oldItem['Ticket']
  );

  const newAssigned = String(
    Object.prototype.hasOwnProperty.call(updates, 'Assigned')
      ? updates['Assigned']
      : oldItem['Assigned']
  ).trim();

  if (newTicket === 'open' && !newAssigned) {
    throw new Error('Please assign a staff member before opening this ticket.');
  }

  if (newAssigned && !STAFF_PROFILES[newAssigned]) {
    throw new Error('Assigned staff is not recognized. Please select a valid assigned staff from the dropdown.');
  }

  const allowedFields = [
    'Tracking Number',
    'Ticket',
    'Confirmation Email',
    'Deliverable(s) Email',
    'Close Email',
    'Status',
    'Assigned',
    'Project Link',
    'Notes',
    'Completion Date',
    'Remarks',
    'Date Needed',
    'Archived'
  ];

  Object.keys(updates).forEach(fieldName => {
    if (!allowedFields.includes(fieldName)) return;

    const colIndex = headers.indexOf(fieldName);

    if (colIndex !== -1) {
      sheet.getRange(rowNumber, colIndex + 1).setValue(updates[fieldName]);
    }
  });

  const updatedItem = getRowObject_(sheet, headers, rowNumber);

  const shouldSendOpeningEmail =
    oldTicket !== 'open' &&
    oldTicket !== 'closed' &&
    normalize_(updatedItem['Ticket']) === 'open' &&
    normalize_(updatedItem['Confirmation Email']) !== 'sent';

  if (shouldSendOpeningEmail) {
    sendOpeningEmail_(updatedItem);
    setCellByHeader_(sheet, headers, rowNumber, 'Confirmation Email', 'Sent');

    const currentStatus = normalize_(updatedItem['Status']);
    if (!currentStatus || currentStatus === 'pending') {
      setCellByHeader_(sheet, headers, rowNumber, 'Status', 'Ongoing');
      updatedItem['Status'] = 'Ongoing';
    }

    sendRequestReceivedWebhookSafe_(updatedItem);
  }

  const latestItem = getRowObject_(sheet, headers, rowNumber);

  const shouldSendClosingEmail =
    normalize_(latestItem['Ticket']) === 'closed' &&
    normalize_(latestItem['Close Email']) !== 'sent';

  if (shouldSendClosingEmail) {
    const hadCompletionDate = Boolean(
      String(latestItem['Completion Date'] || '').trim()
    );

    const completionDate = hadCompletionDate
      ? latestItem['Completion Date']
      : Utilities.formatDate(
          new Date(),
          CONFIG.TIMEZONE,
          CONFIG.DATE_FORMAT
        );

    latestItem['Completion Date'] = completionDate;
    sendClosingEmail_(latestItem);

    setCellByHeader_(sheet, headers, rowNumber, 'Deliverable(s) Email', 'Sent');
    setCellByHeader_(sheet, headers, rowNumber, 'Close Email', 'Sent');
    setCellByHeader_(sheet, headers, rowNumber, 'Status', 'Completed');

    if (!hadCompletionDate) {
      setCellByHeader_(
        sheet,
        headers,
        rowNumber,
        'Completion Date',
        completionDate
      );
    }

    sendCompletionWebhookSafe_(latestItem);
  }

  return {
    success: true,
    message: 'Request updated successfully.'
  };
}

function markRequestCompleted_(rowNumber) {
  if (!rowNumber) {
    throw new Error('Missing row number.');
  }

  const sheet = getSheet_();
  ensureArchiveColumn_(sheet);
  const headers = getHeaders_(sheet);
  const targetRow = Number(rowNumber);

  if (targetRow < 2) {
    throw new Error('Invalid row number.');
  }

  const currentItem = getRowObject_(sheet, headers, targetRow);
  const assigned = String(currentItem['Assigned'] || '').trim();

  if (!assigned) {
    throw new Error('Please assign a staff member before closing this ticket.');
  }

  if (!STAFF_PROFILES[assigned]) {
    throw new Error('Assigned staff is not recognized. Please select a valid assigned staff from the dropdown.');
  }

  const shouldSendCompletionNotification = normalize_(currentItem['Close Email']) !== 'sent';

  const completionDate =
    String(currentItem['Completion Date'] || '').trim() ||
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      CONFIG.DATE_FORMAT
    );

  if (shouldSendCompletionNotification) {
    currentItem['Completion Date'] = completionDate;
    sendClosingEmail_(currentItem);
  }

  const updates = {
    'Ticket': 'Closed',
    'Deliverable(s) Email': 'Sent',
    'Close Email': 'Sent',
    'Status': 'Completed',
    'Completion Date': completionDate
  };

  if (!currentItem['Confirmation Email']) {
    updates['Confirmation Email'] = 'Sent';
  }

  Object.keys(updates).forEach(fieldName => {
    const colIndex = headers.indexOf(fieldName);

    if (colIndex !== -1) {
      sheet.getRange(targetRow, colIndex + 1).setValue(updates[fieldName]);
    }
  });

  if (shouldSendCompletionNotification) {
    currentItem['Completion Date'] = completionDate;
    currentItem['Status'] = 'Completed';
    currentItem['Ticket'] = 'Closed';
    sendCompletionWebhookSafe_(currentItem);
  }

  return {
    success: true,
    message: 'Request marked as completed and closing email sent.'
  };
}


function setRequestArchived_(rowNumber, shouldArchive) {
  if (!rowNumber) {
    throw new Error('Missing row number.');
  }

  const sheet = getSheet_();
  ensureArchiveColumn_(sheet);
  const headers = getHeaders_(sheet);
  const targetRow = Number(rowNumber);

  if (targetRow < 2) {
    throw new Error('Invalid row number.');
  }

  setCellByHeader_(
    sheet,
    headers,
    targetRow,
    'Archived',
    shouldArchive ? 'Yes' : ''
  );

  return {
    success: true,
    archived: Boolean(shouldArchive),
    message: shouldArchive
      ? 'Request archived successfully.'
      : 'Request restored successfully.'
  };
}

function assignRequest_(rowNumber, assignedTo) {
  if (!rowNumber) {
    throw new Error('Missing row number.');
  }

  const cleanAssignedTo = String(assignedTo || '').trim();

  if (cleanAssignedTo && !STAFF_PROFILES[cleanAssignedTo]) {
    throw new Error('Assigned staff is not recognized. Please select a valid assigned staff.');
  }

  const sheet = getSheet_();
  const headers = getHeaders_(sheet);
  const assignedColIndex = headers.indexOf('Assigned');

  if (assignedColIndex === -1) {
    throw new Error('Assigned column not found.');
  }

  sheet
    .getRange(Number(rowNumber), assignedColIndex + 1)
    .setValue(cleanAssignedTo);

  return {
    success: true,
    message: 'Request assigned successfully.'
  };
}

function updateRequestStatus_(rowNumber, status) {
  if (!rowNumber) {
    throw new Error('Missing row number.');
  }

  const sheet = getSheet_();
  const headers = getHeaders_(sheet);
  const statusColIndex = headers.indexOf('Status');

  if (statusColIndex === -1) {
    throw new Error('Status column not found.');
  }

  sheet
    .getRange(Number(rowNumber), statusColIndex + 1)
    .setValue(status || '');

  return {
    success: true,
    message: 'Status updated successfully.'
  };
}

/****************************************************
 * EMAIL AUTOMATION
 ****************************************************/

function sendOpeningEmail_(item) {
  const requesterEmail = String(item['Email Address'] || '').trim();

  if (!requesterEmail) {
    throw new Error('Cannot send opening email because Email Address is blank.');
  }

  const assigned = String(item['Assigned'] || '').trim();

  if (!assigned) {
    throw new Error('Cannot send opening email because Assigned is blank.');
  }

  const staff = STAFF_PROFILES[assigned];

  if (!staff) {
    throw new Error('Cannot send opening email because assigned staff is not recognized.');
  }

  const trackingNumber = valueOrDash_(item['Tracking Number']);
  const requestTitle = valueOrDash_(getRequestTitle_(item));
  const requesterName = valueOrDash_(buildFullName_(item));
  const firstName = valueOrDash_(item['First Name']);
  const office = valueOrDash_(item['Office']);
  const requestType = valueOrDash_(item['Request Type']);
  const requestList = valueOrDash_(item['Request']);
  const dateSubmitted = valueOrDash_(item['Timestamp']);
  const dateNeeded = valueOrDash_(item['Date Needed']);
  const assignedStaff = valueOrDash_(item['Assigned']);

  // Same subject as the closing email to help Gmail group the request.
  const subject = `MCR Request: ${trackingNumber} - ${requestTitle}`;

  const details = [
    buildEmailDetailRow_('Request ID', trackingNumber, true),
    buildEmailDetailRow_('Requester', requesterName),
    buildEmailDetailRow_('Office', office),
    buildEmailDetailRow_('Request Title', requestTitle),
    buildEmailDetailRow_('Request Type', requestType),
    buildEmailDetailRow_('Requested Output(s)', requestList),
    buildEmailDetailRow_('Date Submitted', dateSubmitted),
    buildEmailDetailRow_('Target Completion Date', dateNeeded),
    buildEmailDetailRow_('Assigned Staff', assignedStaff)
  ].join('');

  const trackerUrl = normalizeWebUrl_(CONFIG.TRACKER_LINK);

  const content = `
    <p style="margin:0 0 18px;color:#172b4d;font-size:16px;line-height:1.65;">
      Hello <strong>${escapeHtml_(firstName)}</strong>,
    </p>

    <p style="margin:0 0 22px;color:#4f6480;font-size:14px;line-height:1.7;">
      Thank you for submitting your Marketing and Communications Request.
      Your request has been successfully recorded and is now in our queue.
    </p>

    ${buildEmailDetailsCard_(details)}

    <p style="margin:22px 0 12px;color:#4f6480;font-size:13px;line-height:1.7;">
      You can track the status of your request using your Request ID.
    </p>

    ${buildEmailButton_(trackerUrl, 'Open OSC Request Tracker', '#263f77')}

    <p style="margin:22px 0 0;color:#637792;font-size:12px;line-height:1.65;">
      Turnaround time may vary depending on the nature of the request and the
      volume currently being handled by the office. We will contact you if
      additional information is needed.
    </p>

    ${buildSignatureHtml_(staff)}
  `;

  const htmlBody = buildEmailShell_({
    eyebrow: 'OSC · PANPACIFIC UNIVERSITY',
    title: 'Request Received',
    content
  });

  const plainBody = [
    `Hello ${firstName},`,
    '',
    'Thank you for submitting your Marketing and Communications Request.',
    'Your request has been successfully recorded and is now in our queue.',
    '',
    `Request ID: ${trackingNumber}`,
    `Requester: ${requesterName}`,
    `Office: ${office}`,
    `Request Title: ${requestTitle}`,
    `Request Type: ${requestType}`,
    `Requested Output(s): ${requestList}`,
    `Date Submitted: ${dateSubmitted}`,
    `Target Completion Date: ${dateNeeded}`,
    `Assigned Staff: ${assignedStaff}`,
    '',
    `Track your request: ${trackerUrl}`,
    '',
    'Best regards,',
    staff.displayName,
    'Office of Strategic Communications',
    'Panpacific University'
  ].join('\n');

  sendEmailWithOptionalSignature_(
    requesterEmail,
    subject,
    plainBody,
    htmlBody,
    staff
  );
}

function sendClosingEmail_(item) {
  const requesterEmail = String(item['Email Address'] || '').trim();

  if (!requesterEmail) {
    throw new Error('Cannot send closing email because Email Address is blank.');
  }

  const assigned = String(item['Assigned'] || '').trim();

  if (!assigned) {
    throw new Error('Cannot send closing email because Assigned is blank.');
  }

  const staff = STAFF_PROFILES[assigned];

  if (!staff) {
    throw new Error('Cannot send closing email because assigned staff is not recognized.');
  }

  const trackingNumber = valueOrDash_(item['Tracking Number']);
  const requestTitle = valueOrDash_(getRequestTitle_(item));
  const firstName = valueOrDash_(item['First Name']);
  const office = valueOrDash_(item['Office']);
  const requestList = valueOrDash_(item['Request']);
  const assignedStaff = valueOrDash_(item['Assigned']);
  const completionDate = valueOrDash_(item['Completion Date']);
  const projectLink = String(item['Project Link'] || '').trim();

  // Same subject as the confirmation email to help Gmail group the request.
  const subject = `MCR Request: ${trackingNumber} - ${requestTitle}`;

  const details = [
    buildEmailDetailRow_('Request ID', trackingNumber, true),
    buildEmailDetailRow_('Request Title', requestTitle),
    buildEmailDetailRow_('Office', office),
    buildEmailDetailRow_('Requested Output(s)', requestList),
    buildEmailDetailRow_('Assigned Staff', assignedStaff),
    buildEmailDetailRow_('Completion Date', completionDate)
  ].join('');

  const formUrl = normalizeWebUrl_(CONFIG.FORM_LINK);
  const validProjectUrl = isWebUrl_(projectLink)
    ? normalizeWebUrl_(projectLink)
    : '';

  const projectSection = validProjectUrl
    ? `
      <p style="margin:22px 0 12px;color:#4f6480;font-size:13px;line-height:1.7;">
        Your completed deliverable or project file is available below.
      </p>

      ${buildEmailButton_(validProjectUrl, 'Open Completed Project', '#406f27')}
    `
    : '';

  const content = `
    <p style="margin:0 0 18px;color:#172b4d;font-size:16px;line-height:1.65;">
      Hello <strong>${escapeHtml_(firstName)}</strong>,
    </p>

    <p style="margin:0 0 22px;color:#4f6480;font-size:14px;line-height:1.7;">
      We’re pleased to inform you that your Marketing and Communications
      Request has been successfully completed.
    </p>

    ${buildEmailDetailsCard_(details)}

    ${projectSection}

    <p style="margin:22px 0 12px;color:#4f6480;font-size:13px;line-height:1.7;">
      For future requests, please continue using the official MCR Form.
    </p>

    ${buildEmailButton_(formUrl, 'Open MCR Request Form', '#263f77')}

    <p style="margin:22px 0 0;color:#637792;font-size:12px;line-height:1.65;">
      If you have feedback or notice anything that needs adjustment,
      please reply to this email and let us know.
    </p>

    ${buildSignatureHtml_(staff)}
  `;

  const htmlBody = buildEmailShell_({
    eyebrow: 'OSC · PANPACIFIC UNIVERSITY',
    title: 'Request Completed',
    content
  });

  const plainBodyLines = [
    `Hello ${firstName},`,
    '',
    'We’re pleased to inform you that your Marketing and Communications Request has been successfully completed.',
    '',
    `Request ID: ${trackingNumber}`,
    `Request Title: ${requestTitle}`,
    `Office: ${office}`,
    `Requested Output(s): ${requestList}`,
    `Assigned Staff: ${assignedStaff}`,
    `Completion Date: ${completionDate}`
  ];

  if (validProjectUrl) {
    plainBodyLines.push('', `Completed project: ${validProjectUrl}`);
  }

  plainBodyLines.push(
    '',
    `Future requests: ${formUrl}`,
    '',
    'Best regards,',
    staff.displayName,
    'Office of Strategic Communications',
    'Panpacific University'
  );

  sendEmailWithOptionalSignature_(
    requesterEmail,
    subject,
    plainBodyLines.join('\n'),
    htmlBody,
    staff
  );
}

function buildEmailShell_(options) {
  const eyebrow = escapeHtml_(options.eyebrow || '');
  const title = escapeHtml_(options.title || '');
  const content = options.content || '';

  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#eef4f8;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef4f8;margin:0;padding:0;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #d9e5ee;border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 30px;background-color:#263f77;">
                    <p style="margin:0 0 8px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">
                      ${eyebrow}
                    </p>
                    <h1 style="margin:0;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:1.25;font-weight:700;">
                      ${title}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px;font-family:Arial,Helvetica,sans-serif;background:#ffffff;">
                    ${content}
                  </td>
                </tr>

                <tr>
                  <td style="padding:18px 30px;background:#f8fafc;border-top:1px solid #e3eaf0;color:#60738c;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;">
                    Office of Strategic Communications · Panpacific University
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildEmailDetailsCard_(rowsHtml) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f9fc;border:1px solid #d8e4ee;border-radius:16px;">
      <tr>
        <td style="padding:20px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>
  `;
}

function buildEmailDetailRow_(label, value, emphasize) {
  const labelText = escapeHtml_(label);
  const valueText = escapeHtml_(valueOrDash_(value));
  const valueColor = emphasize ? '#0c5fa8' : '#172b4d';
  const valueWeight = emphasize ? '700' : '600';

  return `
    <tr>
      <td valign="top" style="width:38%;padding:7px 10px 7px 0;color:#637792;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;">
        ${labelText}
      </td>
      <td valign="top" style="padding:7px 0;color:${valueColor};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;font-weight:${valueWeight};word-break:break-word;">
        ${valueText}
      </td>
    </tr>
  `;
}

function buildEmailButton_(url, label, backgroundColor) {
  if (!url) return '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;">
      <tr>
        <td bgcolor="${escapeHtml_(backgroundColor || '#263f77')}" style="border-radius:10px;background:${escapeHtml_(backgroundColor || '#263f77')};">
          <a href="${escapeHtml_(url)}" target="_blank" style="display:inline-block;padding:12px 18px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;line-height:1.2;text-decoration:none;">
            ${escapeHtml_(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function sendEmailWithOptionalSignature_(to, subject, plainBody, htmlBody, staff) {
  const ccList = buildCcList_(staff);

  const mailOptions = {
    to,
    cc: ccList,
    subject,
    body: plainBody,
    htmlBody,
    name: 'Office of Strategic Communications'
  };

  if (staff.signatureFileId) {
    const signatureBlob = DriveApp
      .getFileById(staff.signatureFileId)
      .getBlob()
      .setName('signature.png');

    mailOptions.inlineImages = {
      staffSignature: signatureBlob
    };
  }

  MailApp.sendEmail(mailOptions);
}

function buildCcList_(staff) {
  const ccEmails = [...DEFAULT_EMAIL_CC];

  if (staff && staff.email) {
    ccEmails.push(staff.email);
  }

  return [...new Set(
    ccEmails
      .map(email => String(email || '').trim())
      .filter(Boolean)
  )].join(',');
}

function buildSignatureHtml_(staff) {
  if (staff && staff.signatureFileId) {
    return `
      <div style="margin-top:24px;">
        <img src="cid:staffSignature" alt="${escapeHtml_(staff.displayName)} Signature" style="display:block;width:100%;max-width:500px;height:auto;border:0;">
      </div>
    `;
  }

  return `
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e3eaf0;color:#172b4d;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;">Best regards,</p>
      <p style="margin:0;font-size:13px;line-height:1.55;">
        <strong>${escapeHtml_(staff.displayName || 'OSC Team')}</strong><br>
        Office of Strategic Communications<br>
        Panpacific University
      </p>
    </div>
  `;
}

function normalizeWebUrl_(value) {
  const cleanValue = String(value || '').trim();

  if (!cleanValue) return '';
  if (/^https?:\/\//i.test(cleanValue)) return cleanValue;

  return 'https://' + cleanValue;
}

function isWebUrl_(value) {
  return /^(https?:\/\/|www\.)/i.test(String(value || '').trim());
}

/****************************************************
 * WEBHOOK NOTIFICATIONS
 ****************************************************/

function sendRequestReceivedWebhookSafe_(item) {
  try {
    sendRequestReceivedWebhook_(item);
  } catch (error) {
    Logger.log('Request received webhook failed: ' + error.message);
  }
}

function sendCompletionWebhookSafe_(item) {
  try {
    sendCompletionWebhook_(item);
  } catch (error) {
    Logger.log('Completion webhook failed: ' + error.message);
  }
}

function sendRequestReceivedWebhook_(item) {
  const webhookUrl = getChatWebhookUrl_();

  if (!webhookUrl) {
    Logger.log('Request received webhook skipped: URL is blank.');
    return;
  }

  const platform = normalize_(CONFIG.CHAT_WEBHOOK_PLATFORM);
  const payload = platform === 'google_chat'
    ? buildGoogleChatRequestReceivedCard_(item)
    : buildPlainRequestReceivedWebhookPayload_(item, platform);

  sendWebhookPayload_(payload, 'Request received', webhookUrl);
}

function sendCompletionWebhook_(item) {
  const webhookUrl = getChatWebhookUrl_();

  if (!webhookUrl) {
    Logger.log('Completion webhook skipped: URL is blank.');
    return;
  }

  const platform = normalize_(CONFIG.CHAT_WEBHOOK_PLATFORM);
  const payload = platform === 'google_chat'
    ? buildGoogleChatCompletionCard_(item)
    : buildPlainCompletionWebhookPayload_(item, platform);

  sendWebhookPayload_(payload, 'Completion', webhookUrl);
}

function sendWebhookPayload_(payload, label, webhookUrl) {
  const targetUrl = webhookUrl || getChatWebhookUrl_();

  if (!targetUrl) {
    throw new Error('Google Chat webhook URL is not configured.');
  }

  const response = UrlFetchApp.fetch(targetUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();

  if (responseCode < 200 || responseCode >= 300) {
    throw new Error(
      label + ' webhook returned HTTP ' + responseCode + ': ' + response.getContentText()
    );
  }

  Logger.log(label + ' webhook sent successfully. HTTP ' + responseCode);
}

function buildGoogleChatRequestReceivedCard_(item) {
  const trackingNumber = valueOrDash_(item['Tracking Number']);
  const requestTitle = valueOrDash_(getRequestTitle_(item));
  const requester = valueOrDash_(buildFullName_(item));
  const office = valueOrDash_(item['Office']);
  const requestType = valueOrDash_(item['Request Type']);
  const requestedOutput = valueOrDash_(item['Request']);
  const dateNeeded = valueOrDash_(item['Date Needed']);
  const assigned = valueOrDash_(item['Assigned']);

  return buildGoogleChatRequestCard_({
    cardId: 'osc-received-' + sanitizeCardId_(trackingNumber),
    fallbackText: 'Request received: ' + trackingNumber + ' - ' + requestTitle,
    title: '📥 Request Received',
    subtitle: trackingNumber + ' · ' + requestTitle,
    sectionHeader: 'New Request Summary',
    fields: [
      ['Requester', requester],
      ['Requesting Office', office],
      ['Request Type', requestType],
      ['Requested Output(s)', requestedOutput, true],
      ['Date Needed', dateNeeded],
      ['Assigned Staff', assigned]
    ]
  });
}

function buildGoogleChatCompletionCard_(item) {
  const trackingNumber = valueOrDash_(item['Tracking Number']);
  const requestTitle = valueOrDash_(getRequestTitle_(item));
  const assigned = valueOrDash_(item['Assigned']);
  const office = valueOrDash_(item['Office']);
  const requestType = valueOrDash_(item['Request Type']);
  const requestedOutput = valueOrDash_(item['Request']);
  const dateNeeded = valueOrDash_(item['Date Needed']);
  const completionDate = valueOrDash_(item['Completion Date']);

  return buildGoogleChatRequestCard_({
    cardId: 'osc-completed-' + sanitizeCardId_(trackingNumber),
    fallbackText: 'Task completed: ' + trackingNumber + ' - ' + requestTitle,
    title: '✅ Task Completed',
    subtitle: trackingNumber + ' · ' + requestTitle,
    sectionHeader: 'Completed Request Summary',
    fields: [
      ['Assigned Staff', assigned],
      ['Requesting Office', office],
      ['Request Type', requestType],
      ['Requested Output(s)', requestedOutput, true],
      ['Date Needed', dateNeeded],
      ['Completion Date', completionDate]
    ]
  });
}

function buildGoogleChatRequestCard_(options) {
  const widgets = options.fields.map(function(field) {
    return {
      decoratedText: {
        topLabel: field[0],
        text: escapeChatCardText_(field[1]),
        wrapText: Boolean(field[2])
      }
    };
  });

  const sections = [
    {
      header: options.sectionHeader,
      widgets: widgets
    }
  ];

  if (CONFIG.DASHBOARD_LINK) {
    sections.push({
      widgets: [
        {
          buttonList: {
            buttons: [
              {
                text: 'OPEN OSC DASHBOARD',
                onClick: {
                  openLink: {
                    url: normalizeWebUrl_(CONFIG.DASHBOARD_LINK)
                  }
                }
              }
            ]
          }
        }
      ]
    });
  }

  return {
    text: options.fallbackText,
    cardsV2: [
      {
        cardId: options.cardId,
        card: {
          header: {
            title: options.title,
            subtitle: escapeChatCardText_(options.subtitle)
          },
          sections: sections
        }
      }
    ]
  };
}

function buildPlainRequestReceivedWebhookPayload_(item, platform) {
  const message = [
    '📥 Request Received',
    '',
    'Request ID: ' + valueOrDash_(item['Tracking Number']),
    'Request: ' + valueOrDash_(getRequestTitle_(item)),
    'Requester: ' + valueOrDash_(buildFullName_(item)),
    'Office: ' + valueOrDash_(item['Office']),
    'Assigned to: ' + valueOrDash_(item['Assigned']),
    'Date Needed: ' + valueOrDash_(item['Date Needed']),
    'Dashboard: ' + normalizeWebUrl_(CONFIG.DASHBOARD_LINK)
  ].join('\n');

  return platform === 'discord' ? { content: message } : { text: message };
}

function buildPlainCompletionWebhookPayload_(item, platform) {
  const message = [
    '✅ Task Completed',
    '',
    'Request ID: ' + valueOrDash_(item['Tracking Number']),
    'Request: ' + valueOrDash_(getRequestTitle_(item)),
    'Assigned to: ' + valueOrDash_(item['Assigned']),
    'Office: ' + valueOrDash_(item['Office']),
    'Date Needed: ' + valueOrDash_(item['Date Needed']),
    'Completion Date: ' + valueOrDash_(item['Completion Date']),
    'Dashboard: ' + normalizeWebUrl_(CONFIG.DASHBOARD_LINK)
  ].join('\n');

  return platform === 'discord' ? { content: message } : { text: message };
}

function escapeChatCardText_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeCardId_(value) {
  const cleanValue = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleanValue || String(new Date().getTime());
}

function testRequestReceivedWebhookCard() {
  const sampleRequest = buildWebhookTestRequest_();
  sendRequestReceivedWebhook_(sampleRequest);
  Logger.log('Google Chat request received card test sent.');
}

function testCompletionWebhookCard() {
  const sampleRequest = buildWebhookTestRequest_();
  sendCompletionWebhook_(sampleRequest);
  Logger.log('Google Chat completion card test sent.');
}

function buildWebhookTestRequest_() {
  if (!getChatWebhookUrl_()) {
    throw new Error(
      'Add OSC_CHAT_WEBHOOK_URL under Apps Script Project Settings → Script properties first.'
    );
  }

  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

  return {
    'Tracking Number': 'RID-TEST-001',
    'First Name': 'Sample',
    'Last Name': 'Requester',
    'Purpose': 'Sample Poster Request',
    'Activity Proposal Title': '',
    'Request': 'Social Media Poster',
    'Request Type': 'Creative Design',
    'Assigned': 'Jann Nathaniel Jaravata',
    'Office': 'Office of Strategic Communications',
    'Date Needed': today,
    'Completion Date': today
  };
}

/****************************************************
 * REQUEST FORM AVAILABILITY
 ****************************************************/

function getFormStatus_() {
  const properties = PropertiesService.getScriptProperties();
  const enabledValue = properties.getProperty(FORM_STATUS_KEYS.ENABLED);
  const messageValue = properties.getProperty(FORM_STATUS_KEYS.MESSAGE);
  const updatedAt = properties.getProperty(FORM_STATUS_KEYS.UPDATED_AT) || '';

  const enabled = enabledValue === null
    ? true
    : normalize_(enabledValue) === 'true';

  return {
    success: true,
    enabled: enabled,
    message: messageValue || CONFIG.DEFAULT_FORM_CLOSED_MESSAGE,
    updatedAt: updatedAt
  };
}

function setFormStatus_(enabledValue, messageValue) {
  if (enabledValue === undefined || enabledValue === null || enabledValue === '') {
    throw new Error('Missing form availability value.');
  }

  const enabled = normalize_(enabledValue) === 'true';
  const message = String(messageValue || '').trim() || CONFIG.DEFAULT_FORM_CLOSED_MESSAGE;
  const updatedAt = new Date().toISOString();

  PropertiesService.getScriptProperties().setProperties({
    [FORM_STATUS_KEYS.ENABLED]: String(enabled),
    [FORM_STATUS_KEYS.MESSAGE]: message,
    [FORM_STATUS_KEYS.UPDATED_AT]: updatedAt
  });

  return {
    success: true,
    enabled: enabled,
    message: message,
    updatedAt: updatedAt
  };
}


/****************************************************
 * FACEBOOK POST LINKS — SAFE APPEND ONLY
 ****************************************************/

function ensureFacebookPostLinksColumn_(sheet) {
  const headers = getHeaders_(sheet);
  if (headers.indexOf('Facebook Post Links') !== -1) return;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue('Facebook Post Links');
  SpreadsheetApp.flush();
}

function addFacebookPostLinks_(payload) {
  // An entry code protects against accidental public use, but is NOT
  // a replacement for user authentication or role-based permissions.
  const expectedCode = String(
    PropertiesService.getScriptProperties().getProperty('OSC_POST_LINK_PIN') || ''
  );
  if (!expectedCode) {
    throw new Error('Post logging is not configured. Set OSC_POST_LINK_PIN in Script Properties.');
  }
  if (String(payload.pin || '') !== expectedCode) {
    throw new Error('Incorrect post logging access code.');
  }

  const tracking = String(payload.tracking || '').trim().toUpperCase();
  if (!/^RID[\w-]+$/i.test(tracking)) {
    throw new Error('A valid request tracking number is required.');
  }

  const rawLinks = String(payload.links || '').split(/[\n\r,;]+/)
    .map(function(x) { return x.trim(); })
    .filter(Boolean);
  if (!rawLinks.length || rawLinks.length > 25) {
    throw new Error('Enter 1–25 Facebook post links.');
  }
  const validated = rawLinks.map(function(value) {
    const match = value.match(/^https:\/\/([^/?#\s]+)(?:[/?#]|$)/i);
    if (!match || value.length > 2000) {
      throw new Error('Please provide a valid HTTPS Facebook URL (max 2,000 characters).');
    }
    const host = match[1].toLowerCase();
    if (!(host === 'facebook.com' || host.endsWith('.facebook.com') ||
          host === 'fb.watch' || host === 'www.fb.watch')) {
      throw new Error('Only HTTPS Facebook and fb.watch links are accepted.');
    }
    return value;
  });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    throw new Error('Another update is in progress. Please try again.');
  }

  try {
    const sheet = getSheet_();
    ensureFacebookPostLinksColumn_(sheet);
    const headers = getHeaders_(sheet);
    const trackingCol = headers.indexOf('Tracking Number') + 1;
    const linkCol = headers.indexOf('Facebook Post Links') + 1;
    if (!trackingCol) throw new Error('Tracking Number column missing.');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('No requests found.');
    const ids = sheet.getRange(2, trackingCol, lastRow - 1, 1).getDisplayValues();
    const index = ids.findIndex(function(row) {
      return String(row[0] || '').trim().toUpperCase() === tracking;
    });
    if (index === -1) throw new Error('Request not found: ' + tracking);

    const cell = sheet.getRange(index + 2, linkCol);
    const existing = String(cell.getDisplayValue() || '')
      .split(/[\n\r,;]+/).map(function(x) { return x.trim(); }).filter(Boolean);
    const unique = existing.slice();
    let added = 0;
    validated.forEach(function(url) {
      if (unique.indexOf(url) === -1) { unique.push(url); added++; }
    });
    if (added) {
      cell.setNumberFormat('@');
      cell.setValue(unique.join('\n'));
    }
    return {
      success: true,
      requestID: tracking,
      added: added,
      total: unique.length,
      message: added ? 'Facebook post links saved.' : 'These links were already recorded.'
    };
  } finally {
    lock.releaseLock();
  }
}


/****************************************************
 * INTERN POST DESK — LIMITED QUEUE AND SAVE
 * The public admin API still requires a future proper auth upgrade.
 ****************************************************/
function verifyInternPin_(pin) {
  const expected = String(
    PropertiesService.getScriptProperties().getProperty('OSC_INTERN_LINK_PIN') || ''
  );
  if (!expected) {
    throw new Error('Intern access is not yet configured. Set OSC_INTERN_LINK_PIN in Script Properties.');
  }
  if (String(pin || '') !== expected) {
    throw new Error('Incorrect intern access code.');
  }
}

function requestHasPosting_(value) {
  return /\bposting\b/i.test(String(value || ''));
}

function getPostingQueue_(pin) {
  verifyInternPin_(pin);
  const sheet = getSheet_();
  ensureFacebookPostLinksColumn_(sheet);
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return {success: true, pending: [], count: 0};
  const headings = data[0].map(function(x) {return String(x || '').trim();});
  const idCol = headings.indexOf('Tracking Number');
  const reqCol = headings.indexOf('Request');
  const linkCol = headings.indexOf('Facebook Post Links');
  const purposeCol = headings.indexOf('Purpose');
  const activityCol = headings.indexOf('Activity Proposal Title');
  const archivedCol = headings.indexOf('Archived');
  if (idCol < 0 || reqCol < 0 || linkCol < 0) {
    throw new Error('Missing Tracking Number, Request, or Facebook Post Links column.');
  }
  const pending = [];
  data.slice(1).forEach(function(row) {
    const requestID = String(row[idCol] || '').trim();
    const requestValue = String(row[reqCol] || '');
    const hasLink = String(row[linkCol] || '').trim().length > 0;
    const archived = archivedCol >= 0 && /^(yes|true|archived|hidden)$/i.test(String(row[archivedCol] || '').trim());
    if (!requestID || !requestHasPosting_(requestValue) || hasLink || archived) return;
    pending.push({
      requestID: requestID,
      title: String((purposeCol>=0 && row[purposeCol]) || (activityCol>=0 && row[activityCol]) || requestValue || 'Untitled request').trim()
    });
  });
  return {success:true, pending:pending, count:pending.length};
}

/** Read-only check to run manually from Apps Script before deployment. */
function testInternDeskQueue() {
  const pin = PropertiesService.getScriptProperties().getProperty('OSC_INTERN_LINK_PIN');
  const result = getPostingQueue_(pin);
  Logger.log('Intern Post Desk: ' + result.count + ' posting request(s) pending.');
  return {success: true, count: result.count};
}

function saveInternPostLink_(payload) {
  verifyInternPin_(payload.pin);
  const tracking = String(payload.tracking || '').trim().toUpperCase();
  const url = String(payload.url || '').trim();
  if (!tracking || tracking.length > 100) throw new Error('Invalid request ID.');
  if (url.length > 2000 || !/^https:\/\/([^/?#\s]+)(?:[/?#]|$)/i.test(url)) {
    throw new Error('Enter a full HTTPS Facebook post URL.');
  }
  const host = url.match(/^https:\/\/([^/?#\s]+)/i)[1].toLowerCase();
  if (!(host==='facebook.com' || host.endsWith('.facebook.com') || host==='fb.watch' || host==='www.fb.watch')) {
    throw new Error('Only Facebook and fb.watch links can be saved.');
  }
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Another save is in progress. Please try again.');
  try {
    const sheet=getSheet_();
    ensureFacebookPostLinksColumn_(sheet);
    const data=sheet.getDataRange().getDisplayValues();
    const headers=data[0].map(function(v){return String(v||'').trim();});
    const idCol=headers.indexOf('Tracking Number');
    const reqCol=headers.indexOf('Request');
    const linkCol=headers.indexOf('Facebook Post Links');
    const archCol=headers.indexOf('Archived');
    if (idCol<0 || reqCol<0 || linkCol<0) throw new Error('Required columns are missing.');
    const rowIndex=data.findIndex(function(row,index){return index>0 && String(row[idCol]||'').trim().toUpperCase()===tracking;});
    if (rowIndex<1) throw new Error('Request not found.');
    if (!requestHasPosting_(data[rowIndex][reqCol])) throw new Error('This request does not contain Posting.');
    if (archCol>=0 && /^(yes|true|archived|hidden)$/i.test(String(data[rowIndex][archCol]||'').trim())) throw new Error('This request is archived.');
    if (String(data[rowIndex][linkCol]||'').trim()) {
      return {success:false, message:'A Facebook URL is already saved for this request. Refresh the queue.'};
    }
    sheet.getRange(rowIndex+1,linkCol+1).setNumberFormat('@').setValue(url);
    SpreadsheetApp.flush();
    return {success:true, requestID:tracking, message:'Post link recorded.'};
  } finally {
    lock.releaseLock();
  }
}

/****************************************************
 * SHEET HELPERS
 ****************************************************/

function getSpreadsheet_() {
  const spreadsheetId = String(CONFIG.SPREADSHEET_ID || '').trim();

  if (
    spreadsheetId &&
    spreadsheetId !== 'PASTE_YOUR_SPREADSHEET_ID_HERE'
  ) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  throw new Error(
    'Spreadsheet is not configured. Paste the Google Sheet ID into CONFIG.SPREADSHEET_ID.'
  );
}

function getSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    const availableSheets = spreadsheet
      .getSheets()
      .map(function(currentSheet) {
        return currentSheet.getName();
      })
      .join(', ');

    throw new Error(
      'Sheet "' +
      CONFIG.SHEET_NAME +
      '" was not found. Available sheets: ' +
      (availableSheets || 'None')
    );
  }

  return sheet;
}


function ensureArchiveColumn_(sheet) {
  const headers = getHeaders_(sheet);

  if (headers.indexOf('Archived') !== -1) {
    return;
  }

  const nextColumn = sheet.getLastColumn() + 1;

  sheet
    .getRange(1, nextColumn)
    .setValue('Archived');

  SpreadsheetApp.flush();
}

function getHeaders_(sheet) {
  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(header => String(header).trim());
}

function getRowObject_(sheet, headers, rowNumber) {
  const row = sheet
    .getRange(Number(rowNumber), 1, 1, headers.length)
    .getValues()[0];

  const item = {};

  headers.forEach((header, index) => {
    item[header] = formatCellValue_(row[index], header);
  });

  item.rowNumber = Number(rowNumber);
  item.fullName = buildFullName_(item);
  item.requestDisplayTitle = getRequestTitle_(item);
  item.isOpen = isOpenRequest_(item);
  item.isCompleted = isCompletedRequest_(item);
  item.isUnassigned = isUnassignedRequest_(item);
  item.isOverdue = isOverdue_(item);

  return item;
}

function setCellByHeader_(sheet, headers, rowNumber, headerName, value) {
  const colIndex = headers.indexOf(headerName);

  if (colIndex !== -1) {
    sheet.getRange(Number(rowNumber), colIndex + 1).setValue(value);
  }
}

function formatCellValue_(value, headerName) {
  if (value instanceof Date) {
    if (headerName === 'Timestamp') {
      return Utilities.formatDate(
        value,
        CONFIG.TIMEZONE,
        'yyyy-MM-dd h:mm a'
      );
    }

    if (headerName === 'Start Time' || headerName === 'End Time') {
      return Utilities.formatDate(
        value,
        CONFIG.TIMEZONE,
        'h:mm a'
      );
    }

    return Utilities.formatDate(
      value,
      CONFIG.TIMEZONE,
      CONFIG.DATE_FORMAT
    );
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function buildFullName_(item) {
  const firstName = item['First Name'] || '';
  const lastName = item['Last Name'] || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Unnamed Requester';
}

function getRequestTitle_(item) {
  return (
    item['Purpose'] ||
    item['Activity Proposal Title'] ||
    item['Request'] ||
    'Untitled Request'
  );
}


function isArchivedRequest_(item) {
  const archived = normalize_(item['Archived']);

  return (
    archived === 'yes' ||
    archived === 'true' ||
    archived === 'archived' ||
    archived === 'hidden'
  );
}

function isOpenRequest_(item) {
  const ticket = normalize_(item['Ticket']);
  const status = normalize_(item['Status']);

  if (ticket === 'open') return true;
  if (status === 'completed') return false;
  if (ticket === 'closed') return false;

  return false;
}

function isCompletedRequest_(item) {
  const ticket = normalize_(item['Ticket']);
  const status = normalize_(item['Status']);

  return ticket === 'closed' || status === 'completed';
}

function isUnassignedRequest_(item) {
  const assigned = normalize_(item['Assigned']);
  const ticket = normalize_(item['Ticket']);

  return assigned === '' || ticket === '';
}

function isOverdue_(item) {
  if (!item['Date Needed']) return false;
  if (!item.isOpen) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const neededDate = new Date(item['Date Needed']);
  neededDate.setHours(0, 0, 0, 0);

  if (isNaN(neededDate.getTime())) return false;

  return neededDate < today;
}

/****************************************************
 * SECURE CONFIG HELPERS
 ****************************************************/

function getChatWebhookUrl_() {
  return String(
    PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.CHAT_WEBHOOK_PROPERTY) || ''
  ).trim();
}

/**
 * Optional helper for checking whether the secure webhook
 * property has already been configured.
 */
function getWebhookConfigurationStatus() {
  return {
    configured: Boolean(getChatWebhookUrl_()),
    propertyName: CONFIG.CHAT_WEBHOOK_PROPERTY
  };
}

/****************************************************
 * HELPERS
 ****************************************************/

function normalize_(value) {
  return String(value || '').trim().toLowerCase();
}

function valueOrDash_(value) {
  return value && String(value).trim() ? String(value).trim() : '—';
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createResponse_(data, callback) {
  const json = JSON.stringify(data);

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/****************************************************
 * OPTIONAL AUTHORIZATION TEST
 * Run this manually once if permissions are needed.
 ****************************************************/

function authorizeDashboardPermissions() {
  const sheet = getSheet_();
  const spreadsheet = sheet.getParent();

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: 'OSC Dashboard Authorization Test',
    body:
      'Authorization successful for OSC Dashboard connected to: ' +
      spreadsheet.getName() +
      ' / ' +
      sheet.getName()
  });

  Logger.log(
    'Authorized spreadsheet: ' +
    spreadsheet.getName() +
    ' / ' +
    sheet.getName()
  );
}

/**
 * Run this before deploying.
 * It checks the spreadsheet connection and required headers
 * without changing any request data.
 */
function testDashboardConnection() {
  const sheet = getSheet_();
  const headers = getHeaders_(sheet);

  const requiredHeaders = [
    'Email Address',
    'Office',
    'Request',
    'Ticket',
    'Status',
    'Assigned',
    'Tracking Number'
  ];

  const missingHeaders = requiredHeaders.filter(function(header) {
    return headers.indexOf(header) === -1;
  });

  if (missingHeaders.length) {
    throw new Error(
      'Connection succeeded, but these required headers are missing: ' +
      missingHeaders.join(', ')
    );
  }

  Logger.log(
    'Connection successful. Spreadsheet: ' +
    sheet.getParent().getName() +
    ' | Sheet: ' +
    sheet.getName() +
    ' | Rows: ' +
    sheet.getLastRow()
  );

  return {
    success: true,
    spreadsheet: sheet.getParent().getName(),
    sheet: sheet.getName(),
    rows: sheet.getLastRow(),
    headers: headers
  };
}


/****************************************************
 * FACEBOOK POST MONITORING v1.6.4
 * Reads/writes the existing 'Post Monitoring Log' only.
 * Does NOT change or recreate 'SDG Summary & Grouping'.
 * Keep the existing MCR request endpoints unchanged.
 ****************************************************/
const MONITORING_CONFIG = {
  SPREADSHEET_ID: '1z3iOYk_ODNrrlyZXKCwNk1i14OIFmYHbV2fgsv2-r-I',
  TAB_NAME: 'Post Monitoring Log',
  HEADER_ROW: 3,
  START_ROW: 4,
  IMPORT_PIN_PROPERTY: 'OSC_POST_IMPORT_PIN',
  MAX_IMPORT_BATCH: 3,
  SDG_NAMES: [
    'No Poverty', 'Zero Hunger', 'Good Health and Well-being',
    'Quality Education', 'Gender Equality', 'Clean Water and Sanitation',
    'Affordable and Clean Energy', 'Decent Work and Economic Growth',
    'Industry, Innovation and Infrastructure', 'Reduced Inequalities',
    'Sustainable Cities and Communities', 'Responsible Consumption and Production',
    'Climate Action', 'Life Below Water', 'Life on Land',
    'Peace, Justice and Strong Institutions', 'Partnerships for the Goals'
  ],
  CORE_VALUES: ['Pioneer', 'Compassion', 'Service', 'Truth']
};

function getMonitoringSheet_() {
  const book = SpreadsheetApp.openById(MONITORING_CONFIG.SPREADSHEET_ID);
  const sheet = book.getSheetByName(MONITORING_CONFIG.TAB_NAME);
  if (!sheet) throw new Error('Cannot locate the Post Monitoring Log tab.');
  const found = sheet.getRange(3, 2, 1, 12).getDisplayValues()[0]
    .map(function(x){ return String(x||'').trim(); });
  const required = ['Post Date','Post Topic / Caption Summary','Facebook Post URL',
    'Primary SDG','Secondary SDG','SDG 3','SDG 4','SDG 5',
    'Primary Core Value','Secondary Core Value','Core Value 3','Core Value 4'];
  for (let n=0;n<required.length;n++) {
    if (found[n]!==required[n]) {
      throw new Error('Monitoring column mismatch in '+String.fromCharCode(66+n)+
        '3. Expected "'+required[n]+'", found "'+found[n]+'".');
    }
  }
  return sheet;
}

/**
 * Keep the first five SDGs in E:I, the four Core Values in J:M, and queue metadata
 * in N. Extra SDGs (6th through 17th selections) go in O as full SDG labels.
 * This intentionally does NOT shift any columns in the existing monitoring Sheet.
 */
function ensureMonitoringExtraSdgColumn_(sheet) {
  const name='Additional SDGs';
  const cell=sheet.getRange(MONITORING_CONFIG.HEADER_ROW,15);
  const existing=String(cell.getDisplayValue()||'').trim();
  if (existing && existing!==name) {
    throw new Error('Column O is already in use (O3: '+existing+'). No tagging data was changed.');
  }
  if (!existing) cell.setValue(name);
}

/** Parse only canonical full SDG labels written by this application in column O. */
function getExtraSdgLabels_(cellValue) {
  return String(cellValue||'').split(/\s*\|\s*/).map(function(item){return item.trim();})
    .filter(function(label){return /^SDG\s+(?:[1-9]|1[0-7]):\s+\S/i.test(label);});
}

/**
 * N3 is the optional, purpose-built metadata column for the intern tagging queue.
 * It does not move or delete Sheet rows, so the existing summary formulas stay intact.
 * A nonempty ISO timestamp means "deferred"; later timestamps go further back.
 */
function ensureMonitoringQueueColumn_(sheet) {
  const name='Tagging Queue Deferred At';
  const cell=sheet.getRange(MONITORING_CONFIG.HEADER_ROW,14);
  const existing=String(cell.getDisplayValue()||'').trim();
  if (existing && existing!==name) {
    throw new Error('Column N is already in use (N3: '+existing+'). Queue metadata was not changed.');
  }
  if (!existing) cell.setValue(name);
}

function readMonitoringRows_(sheet) {
  const lastRow=sheet.getLastRow();
  if (lastRow<MONITORING_CONFIG.START_ROW) return [];
  const extraHeader=String(sheet.getRange(3,15).getDisplayValue()||'').trim();
  if (extraHeader && extraHeader!=='Additional SDGs') {
    throw new Error('Column O is in use for another purpose; cannot read extra SDG data safely.');
  }
  const rows=sheet.getRange(MONITORING_CONFIG.START_ROW,2,lastRow-MONITORING_CONFIG.START_ROW+1,14).getDisplayValues();
  return rows.map(function(values,index){
    // E:I are the first five SDG labels. O holds the extra 6th–17th labels.
    const sdgs=values.slice(3,8).concat(extraHeader?getExtraSdgLabels_(values[13]):[]);
    return {sheetRow:index+MONITORING_CONFIG.START_ROW,date:values[0],title:values[1],url:values[2],
      sdgs:sdgs,coreValues:values.slice(8,12),
      deferredAt:String(values[12]||'').trim()};
  }).filter(function(post){return post.date||post.title||post.url;});
}

function normalizePostUrl_(input) {
  const url=String(input||'').trim();
  const match=url.match(/^https:\/\/([^\/?#\s]+)(\/[^?#\s]*)?/i);
  if (!match || url.length>1400) throw new Error('A complete HTTPS Facebook post link is required.');
  const host=match[1].toLowerCase();
  if (!(host==='facebook.com'||host.endsWith('.facebook.com')||host==='fb.watch')) {
    throw new Error('Only Facebook/fb.watch post URLs are accepted.');
  }
  return url;
}

function canonicalPostUrl_(input) {
  return String(input||'').trim().toLowerCase().split(/[?#]/)[0].replace(/\/+$/,'');
}

function verifyMonitoringImportPin_(pin) {
  const expected=String(PropertiesService.getScriptProperties()
    .getProperty(MONITORING_CONFIG.IMPORT_PIN_PROPERTY)||'');
  if (!expected) throw new Error('Monthly CSV import access is not configured. Add OSC_POST_IMPORT_PIN in Script Properties.');
  if (String(pin||'')!==expected) throw new Error('Incorrect monthly import access code.');
}

function requireValidMonitoringDate_(input) {
  const value=String(input||'').trim();
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Use an unambiguous YYYY-MM-DD post date.');
  const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]);
  const parsed=new Date(y,m-1,d);
  if (parsed.getFullYear()!==y || parsed.getMonth()!==m-1 || parsed.getDate()!==d) {
    throw new Error('Invalid post date: '+value);
  }
  return parsed;
}

function getMonitoringTagQueue_(pin) {
  verifyInternPin_(pin); // Reuses the existing OSC_INTERN_LINK_PIN.
  const sheet=getMonitoringSheet_();
  ensureMonitoringQueueColumn_(sheet);
  const pending=readMonitoringRows_(sheet)
    .filter(function(post){
      return !!post.url && post.sdgs.every(function(value){return !String(value||'').trim();});
    })
    .sort(function(a,b){
      // Untouched rows first; deferred rows at the back in time order.
      const da=a.deferredAt,db=b.deferredAt;
      if (!!da!==!!db) return da ? 1 : -1;
      if (da && db && da!==db) return da<db ? -1 : 1;
      return a.sheetRow-b.sheetRow;
    })
    .map(function(post){
      return {rowNumber:post.sheetRow,date:post.date,title:post.title,url:post.url,
        deferred:!!post.deferredAt,
        coreValues:post.coreValues.filter(function(v){return !!String(v||'').trim();})};
    });
  return {success:true,pending:pending,count:pending.length,
    deferredCount:pending.filter(function(row){return row.deferred;}).length};
}

/** Persistent, nondestructive "Move to End" action for untagged posts. */
function deferMonitoringPost_(params) {
  verifyInternPin_(params.pin);
  const rowNumber=Number(params.rowNumber);
  if (!Number.isInteger(rowNumber)||rowNumber<MONITORING_CONFIG.START_ROW) throw new Error('Invalid monitoring row.');
  const originalUrl=canonicalPostUrl_(normalizePostUrl_(params.url));
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Another tagging action is in progress. Try again.');
  try {
    const sheet=getMonitoringSheet_();
    ensureMonitoringQueueColumn_(sheet);
    if (rowNumber>sheet.getLastRow()) throw new Error('Post no longer exists. Refresh the queue.');
    const values=sheet.getRange(rowNumber,2,1,14).getDisplayValues()[0];
    if (canonicalPostUrl_(values[2])!==originalUrl) throw new Error('This post has changed. Refresh the queue.');
    if (values.slice(3,8).some(function(v){return String(v||'').trim();}) || String(values[13]||'').trim()) {
      throw new Error('This post is already tagged. Refresh your queue.');
    }
    // Add a monotonic millisecond marker, also when a post is deferred repeatedly.
    const prior=Date.parse(String(values[12]||''))||0;
    const now=new Date(Math.max(Date.now(),prior+1000)).toISOString();
    sheet.getRange(rowNumber,14).setValue(now);
    SpreadsheetApp.flush();
    return {success:true,rowNumber:rowNumber,message:'Moved to the end of the tagging queue.'};
  } finally {lock.releaseLock();}
}

/** Read-only search index, restricted to configured intern or import access codes. */
function getMonitoringPostDatabase_(pin) {
  const properties=PropertiesService.getScriptProperties();
  const intern=String(properties.getProperty('OSC_INTERN_LINK_PIN')||'');
  const importer=String(properties.getProperty(MONITORING_CONFIG.IMPORT_PIN_PROPERTY)||'');
  const supplied=String(pin||'');
  if (!supplied || (supplied!==intern && supplied!==importer)) {
    throw new Error('Incorrect access code. Use the intern or monthly import code.');
  }
  const posts=readMonitoringRows_(getMonitoringSheet_())
    .filter(function(post){return !!post.url;})
    .map(function(post){
      return {date:post.date,title:post.title,url:post.url,
        sdgs:post.sdgs.filter(function(x){return !!String(x||'').trim();}),
        coreValues:post.coreValues.filter(function(x){return !!String(x||'').trim();}),
        tagged:post.sdgs.some(function(x){return !!String(x||'').trim();})};
    });
  return {success:true,posts:posts,count:posts.length};
}

function parseMonitoringSelections_(values,min,max,allowed) {
  let tokens=values;
  if (typeof tokens==='string') tokens=tokens.split(',');
  if (!Array.isArray(tokens)) tokens=[];
  const output=[];
  tokens.forEach(function(value){
    const token=String(value||'').trim();
    if (!token) return;
    if (!allowed(token)) throw new Error('Invalid SDG or core value selection.');
    if (output.indexOf(token)===-1) output.push(token);
  });
  if (output.length<min || output.length>max) {
    throw new Error('Choose between '+min+' and '+max+' values.');
  }
  return output;
}

function saveMonitoringTags_(params) {
  verifyInternPin_(params.pin);
  const rowNumber=Number(params.rowNumber);
  if (!Number.isInteger(rowNumber)||rowNumber<4) throw new Error('Invalid monitoring row.');
  const title=String(params.title||'').replace(/\s+/g,' ').trim();
  if (!title || title.length>300) throw new Error('Enter a post title (1–300 characters).');
  const sdgTokens=parseMonitoringSelections_(params.sdgs,1,17,function(token){
    return /^\d+$/.test(token) && Number(token)>=1 && Number(token)<=17;
  }).map(Number);
  const coreTokens=parseMonitoringSelections_(params.coreValues||'',1,4,function(token){
    return MONITORING_CONFIG.CORE_VALUES.indexOf(token)!==-1;
  });
  const originalUrl=canonicalPostUrl_(normalizePostUrl_(params.url));
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Another save is being processed. Try again.');
  try {
    const sheet=getMonitoringSheet_();
    ensureMonitoringExtraSdgColumn_(sheet); // Safe header check BEFORE any post values change.
    if (rowNumber>sheet.getLastRow()) throw new Error('Monitoring entry no longer exists. Refresh the queue.');
    const row=sheet.getRange(rowNumber,2,1,14).getDisplayValues()[0];
    if (canonicalPostUrl_(row[2])!==originalUrl) throw new Error('This row has changed. Refresh the queue.');
    if (row.slice(3,8).some(function(v){return String(v||'').trim();}) || String(row[13]||'').trim()) {
      throw new Error('This post has already been tagged. Refresh to prevent overwriting.');
    }
    const labels=sdgTokens.sort(function(a,b){return a-b;}).map(function(n){
      return 'SDG '+n+': '+MONITORING_CONFIG.SDG_NAMES[n-1];
    });
    const sdgs=labels.slice(0,5);
    const extras=labels.slice(5).join(' | ');
    while(sdgs.length<5) sdgs.push('');
    while(coreTokens.length<4) coreTokens.push('');
    // Keep all existing column positions: E:I first five, J:M Core Values,
    // N persistent defer metadata, O all remaining SDGs (sixth through seventeenth).
    sheet.getRange(rowNumber,3).setValue(title);
    sheet.getRange(rowNumber,5,1,9).setValues([sdgs.concat(coreTokens)]);
    sheet.getRange(rowNumber,15).setValue(extras);
    // The post leaves the queue; no need to retain its defer marker.
    const queueHeader=String(sheet.getRange(3,14).getDisplayValue()||'').trim();
    if (queueHeader==='Tagging Queue Deferred At') sheet.getRange(rowNumber,14).clearContent();
    SpreadsheetApp.flush();
    return {success:true,rowNumber:rowNumber,title:title,
      message:'Title, all selected SDGs, and Core Values saved in the Post Monitoring Log.'};
  } finally {lock.releaseLock();}
}

function importMonitoringPosts_(params) {
  verifyMonitoringImportPin_(params.pin);
  let records=params.records;
  if (typeof records==='string') {
    try{records=JSON.parse(records);}catch(error){throw new Error('Invalid CSV import batch.');}
  }
  if (!Array.isArray(records)||!records.length||records.length>MONITORING_CONFIG.MAX_IMPORT_BATCH) {
    throw new Error('Send a batch of 1–'+MONITORING_CONFIG.MAX_IMPORT_BATCH+' posts.');
  }
  // Validate every record before any insertion.
  const prepared=records.map(function(record){
    const date=requireValidMonitoringDate_(record.date);
    const title=String(record.title||'').replace(/\s+/g,' ').trim().slice(0,300);
    const url=normalizePostUrl_(record.url);
    if (!title) throw new Error('A post topic/caption is missing.');
    return {date:date,title:title,url:url};
  });
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('An import is in progress. Try again.');
  try {
    const sheet=getMonitoringSheet_();
    const existing=readMonitoringRows_(sheet);
    const existingUrls=new Set(existing.map(function(post){return canonicalPostUrl_(post.url);}).filter(Boolean));
    const newPosts=[];
    let duplicateCount=0;
    prepared.forEach(function(post){
      const key=canonicalPostUrl_(post.url);
      if (existingUrls.has(key)) {duplicateCount++;return;}
      existingUrls.add(key);
      newPosts.push(post);
    });
    if (!newPosts.length) return {success:true,imported:0,duplicates:duplicateCount};
    const finalUsedRow=existing.reduce(function(n,post){return Math.max(n,post.sheetRow);},3);
    const startRow=finalUsedRow+1;
    const endRow=startRow+newPosts.length-1;
    const needed=endRow-sheet.getMaxRows();
    if (needed>0) sheet.insertRowsAfter(sheet.getMaxRows(),needed);
    newPosts.forEach(function(post,index){
      const row=startRow+index;
      // Copy only formatting and dropdown validation, not old values.
      sheet.getRange(4,2,1,12).copyTo(sheet.getRange(row,2,1,12),
        SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);
      sheet.getRange(4,5,1,9).copyTo(sheet.getRange(row,5,1,9),
        SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,false);
      sheet.getRange(row,2,1,12).setValues([[
        post.date,post.title,post.url,'','','','','','','','',''
      ]]);
      sheet.getRange(row,2).setNumberFormat('yyyy-mm-dd');
      if (String(sheet.getRange(3,14).getDisplayValue()||'').trim()==='Tagging Queue Deferred At') {
        sheet.getRange(row,14).clearContent();
      }
    });
    SpreadsheetApp.flush();
    return {success:true,imported:newPosts.length,duplicates:duplicateCount,
      firstRow:startRow,lastRow:endRow};
  } finally {lock.releaseLock();}
}

/**
 * ONE-TIME, OPT-IN update for the existing SDG Summary & Grouping tab.
 * IMPORTANT: Only run after backing up the monitoring workbook. This function
 * also creates a hidden copy of the original summary tab before editing formulas.
 * Existing summary formulas were limited to row 69 and SDGs in E:I. The new
 * formulas include additional SDGs stored in O and future imported rows.
 * Does not change any post data or the dropdown selection cells H8 and N8.
 */
function upgradeMonitoringSummaryForAllSdgs() {
  const dataSheet=getMonitoringSheet_();
  // Check the O-column before making any changes to the summary.
  ensureMonitoringExtraSdgColumn_(dataSheet);
  const book=dataSheet.getParent();
  const summary=book.getSheetByName('SDG Summary & Grouping');
  if (!summary) throw new Error('SDG Summary & Grouping tab not found; no summary formulas were changed.');
  if (String(summary.getRange('B8').getDisplayValue())!=='Goal ID' ||
      String(summary.getRange('C8').getDisplayValue())!=='Sustainable Development Goal' ||
      String(summary.getRange('D8').getDisplayValue())!=='Posts Count' ||
      String(summary.getRange('H8').getDisplayValue()).indexOf('SDG ')!==0 && String(summary.getRange('H8').getDisplayValue())!=='All Goals') {
    throw new Error('Unexpected SDG Summary layout. No formulas were changed.');
  }
  const old=summary.getRange('D9:D25').getFormulas();
  if (old.length!==17 || old.some(function(r){return !r[0] || r[0].indexOf('COUNTIF')===-1;})) {
    throw new Error('SDG Summary count formulas have been customized. No formulas were changed.');
  }
  const protectedCells=['B4','J8','G10','Q8','M10'];
  protectedCells.forEach(function(a1){
    const oldFormula=summary.getRange(a1).getFormula();
    if (!oldFormula || (a1==='G10'||a1==='M10' ? oldFormula.indexOf('FILTER')===-1 : oldFormula.indexOf('COUNT')===-1)) {
      throw new Error('Unexpected formula at '+a1+'. No formulas were changed.');
    }
  });
  // Preserve the original formula definitions, formatting and dropdown cells.
  const backupName='SDG Summary Backup v1.6.4';
  if (!book.getSheetByName(backupName)) {
    const copy=summary.copyTo(book);
    copy.setName(backupName);
    copy.hideSheet();
  }
  const log="'Post Monitoring Log'!";
  summary.getRange('B4').setFormula('=COUNTA('+log+'$D$4:$D)');
  const counts=[];
  for (let row=9;row<=25;row++) {
    // Each goal label is stored in just one location for each post: E:I or O.
    counts.push(['=COUNTIF('+log+'$E$4:$I,C'+row+')+COUNTIF('+log+'$O$4:$O,"*"&C'+row+'&"*")']);
  }
  summary.getRange('D9:D25').setFormulas(counts);
  summary.getRange('J8').setFormula('=IF(H8="All Goals",COUNTA('+log+'$D$4:$D),COUNTIF('+log+'$E$4:$I,H8)+COUNTIF('+log+'$O$4:$O,"*"&H8&"*"))');
  const matches=['E','F','G','H','I'].map(function(col){return '('+log+'$'+col+'$4:$'+col+'=H8)';});
  matches.push('ARRAYFORMULA(IFERROR(ISNUMBER(SEARCH(H8,'+log+'$O$4:$O)),FALSE))');
  const sdgFilter='=IFERROR(IF(H8="All Goals",FILTER('+log+'$B$4:$F,'+log+'$D$4:$D<>""),FILTER('+log+'$B$4:$F,'+matches.join('+')+')), {"No matching posts found for selected SDG","","","",""})';
  summary.getRange('G10').setFormula(sdgFilter);
  // Also remove the old row 69 limit on Core Value grouping and totals.
  summary.getRange('Q8').setFormula('=IF(N8="All Core Values",COUNTA('+log+'$D$4:$D),COUNTIF('+log+'$J$4:$M,N8))');
  const coreMatches=['J','K','L','M'].map(function(col){return '('+log+'$'+col+'$4:$'+col+'=N8)';});
  const coreOutput='{'+log+'$B$4:$D,'+log+'$J$4:$K}';
  summary.getRange('M10').setFormula('=IFERROR(IF(N8="All Core Values",FILTER('+coreOutput+','+log+'$D$4:$D<>""),FILTER('+coreOutput+','+coreMatches.join('+')+')), {"No matching posts found for selected Core Value","","","",""})');
  SpreadsheetApp.flush();
  Logger.log('v1.6.4 summary formulas updated. Original tab backed up (hidden) as "'+backupName+'".');
  return {success:true,backupTab:backupName,summaryTab:summary.getName()};
}

/** Manual safe test: checks the connected workbook and tab without editing. */
function testMonitoringConnection() {
  const sheet=getMonitoringSheet_();
  const rows=readMonitoringRows_(sheet);
  const result={success:true,spreadsheet:sheet.getParent().getName(),
    tab:sheet.getName(),posts:rows.length,
    needsTagging:rows.filter(function(row){return row.url&&row.sdgs.every(function(x){return !x;});}).length};
  Logger.log(JSON.stringify(result));
  return result;
}
