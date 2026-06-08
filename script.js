/****************************************************
 * OSC REQUEST MANAGEMENT DASHBOARD
 * Frontend: GitHub Pages
 * Backend: Google Apps Script Web App
 ****************************************************/

const API_URL = 'https://script.google.com/macros/s/AKfycbzJm6yMelTE5TSZE0T0tBH4efVOWGFDxZk55BLZ_LgFmxewRzA3tqaczWWoM2ZGrCwBSw/exec';

/**
 * App state
 */
let allRequests = [];
let currentView = 'open';
let selectedRequest = null;

let currentSort = {
  field: 'Date Needed',
  direction: 'asc'
};

/**
 * Fields shown in the submitted details section.
 * These are mostly read-only form submission details.
 */
const DETAIL_FIELDS = [
  'Timestamp',
  'Email Address',
  'Last Name',
  'First Name',
  'Office',
  'Request Type',
  'Purpose',
  'Activity Proposal Title',
  'Description',
  'Start Time',
  'End Time',
  'Start Date',
  'End Date',
  'Where',
  'Who',
  'SDG',
  'Core Value',
  'Proposal',
  'Request',
  'Date Needed',
  'Size/Dimensions',
  'Design Peg/Reference',
  'Remarks',
  'Caption',
  'Assets Drive Link',
  'Tracking Number',
  'Ticket',
  'Confirmation Email',
  'Deliverable(s) Email',
  'Close Email',
  'Status',
  'Assigned',
  'Project Link',
  'Notes',
  'Completion Date'
];

/**
 * Editable fields sent back to Google Sheets.
 */
const EDITABLE_FIELDS = {
  'Tracking Number': 'editTrackingNumber',
  'Ticket': 'editTicket',
  'Status': 'editStatus',
  'Assigned': 'editAssigned',
  'Date Needed': 'editDateNeeded',
  'Completion Date': 'editCompletionDate',
  'Confirmation Email': 'editConfirmationEmail',
  'Deliverable(s) Email': 'editDeliverablesEmail',
  'Close Email': 'editCloseEmail',
  'Project Link': 'editProjectLink',
  'Remarks': 'editRemarks',
  'Notes': 'editNotes'
};

/**
 * Init
 */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  refreshDashboard();
});

/**
 * Event bindings
 */
function bindEvents() {
  document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);

  document.getElementById('searchInput').addEventListener('input', renderCurrentView);
  document.getElementById('statusFilter').addEventListener('change', renderCurrentView);

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      switchView(button.dataset.view);
    });
  });

  document.querySelectorAll('.sort-btn').forEach((button) => {
    button.addEventListener('click', () => {
      handleSort(button.dataset.sort);
    });
  });

  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  document.getElementById('saveChangesBtn').addEventListener('click', handleSaveChanges);
  document.getElementById('markCompletedBtn').addEventListener('click', handleMarkCompleted);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  });
}

/**
 * Refresh dashboard data.
 */
function refreshDashboard() {
  if (!isApiConfigured()) return;

  showLoading('Loading requests...');

  callApi('getRequests')
    .then((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Unable to load requests.');
      }

      allRequests = response.requests || [];
      updateSummaryCards();
      renderCurrentView();
      showToast('Dashboard refreshed.', 'success');
    })
    .catch((error) => {
      console.error(error);
      showToast(error.message || 'Something went wrong while loading data.', 'error');
      renderEmptyState('Unable to load requests.');
    })
    .finally(() => {
      hideLoading();
    });
}

/**
 * Switch active dashboard tab.
 */
function switchView(view) {
  currentView = view;

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  updateViewHeader();
  renderCurrentView();
}

/**
 * Update title and subtitle depending on selected tab.
 */
function updateViewHeader() {
  const title = document.getElementById('activeViewTitle');
  const subtitle = document.getElementById('activeViewSubtitle');

  const viewMap = {
    open: {
      title: 'Open Projects',
      subtitle: 'Requests that are still active and not yet marked as completed.'
    },
    all: {
      title: 'All Requests',
      subtitle: 'All submitted requests regardless of ticket, assignment, or status.'
    },
    completed: {
      title: 'Completed Requests',
      subtitle: 'Requests that are already marked as completed or closed.'
    },
    unassigned: {
      title: 'Unassigned Requests',
      subtitle: 'Requests that do not currently have an assigned staff member.'
    }
  };

  title.textContent = viewMap[currentView].title;
  subtitle.textContent = viewMap[currentView].subtitle;
}

/**
 * Render current table view.
 */
function renderCurrentView() {
  let requests = getRequestsForCurrentView();
  requests = applySearchFilter(requests);
  requests = applyStatusFilter(requests);
  requests = applySort(requests);

  updateSortIndicators();

  if (!requests.length) {
    renderEmptyState('No requests found for this view.');
    return;
  }

  const tbody = document.getElementById('requestTableBody');

  tbody.innerHTML = requests.map((request) => {
    const trackingNumber = valueOrDash(request['Tracking Number']);
    const title = valueOrDash(request['Activity Proposal Title'] || request['Request']);
    const requester = valueOrDash(request.fullName);
    const office = valueOrDash(request['Office']);
    const dateNeeded = valueOrDash(request['Date Needed']);
    const status = valueOrDefault(request['Status'], 'Pending');
    const assigned = valueOrDefault(request['Assigned'], 'Unassigned');
    const ticket = valueOrDefault(request['Ticket'], 'Open');

    const isOverdue = request.isOverdue;
    const assignedClass = assigned === 'Unassigned' ? 'assigned-empty' : 'assigned-text';

    return `
      <tr>
        <td>
          <span class="tracking-text">${escapeHtml(trackingNumber)}</span>
        </td>

        <td>
          <div class="request-title">${escapeHtml(title)}</div>
          <div class="request-meta">${escapeHtml(requester)}</div>
        </td>

        <td>${escapeHtml(office)}</td>

        <td>
          <span class="date-needed ${isOverdue ? 'overdue' : ''}">
            ${escapeHtml(dateNeeded)}
          </span>
          ${isOverdue ? '<div class="request-meta">Overdue</div>' : ''}
        </td>

        <td>
          ${createStatusBadge(status)}
        </td>

        <td>
          <span class="${assignedClass}">
            ${escapeHtml(assigned)}
          </span>
        </td>

        <td>
          ${createTicketBadge(ticket)}
        </td>

        <td>
          <button class="table-btn" type="button" onclick="openRequestModal(${request.rowNumber})">
            View / Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Get requests based on selected tab.
 */
function getRequestsForCurrentView() {
  switch (currentView) {
    case 'open':
      return allRequests.filter((item) => item.isOpen);

    case 'completed':
      return allRequests.filter((item) => item.isCompleted);

    case 'unassigned':
      return allRequests.filter((item) => item.isUnassigned);

    case 'all':
    default:
      return [...allRequests];
  }
}

/**
 * Search filter.
 */
function applySearchFilter(requests) {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  if (!query) return requests;

  return requests.filter((request) => {
    const searchableText = [
      request['Tracking Number'],
      request['Ticket'],
      request['Activity Proposal Title'],
      request['Request'],
      request['Description'],
      request['Office'],
      request['Request Type'],
      request['Purpose'],
      request['Date Needed'],
      request['Status'],
      request['Assigned'],
      request['Email Address'],
      request.fullName,
      request['Remarks'],
      request['Notes']
    ].join(' ').toLowerCase();

    return searchableText.includes(query);
  });
}

/**
 * Status dropdown filter.
 */
function applyStatusFilter(requests) {
  const status = document.getElementById('statusFilter').value.trim().toLowerCase();

  if (!status) return requests;

  return requests.filter((request) => {
    return normalize(request['Status']) === status;
  });
}

/**
 * Sort handler.
 */
function handleSort(field) {
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.field = field;
    currentSort.direction = 'asc';
  }

  renderCurrentView();
}

/**
 * Apply sorting.
 */
function applySort(requests) {
  const sorted = [...requests];
  const field = currentSort.field;
  const direction = currentSort.direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    const valueA = getSortValue(a, field);
    const valueB = getSortValue(b, field);

    if (valueA < valueB) return -1 * direction;
    if (valueA > valueB) return 1 * direction;
    return 0;
  });

  return sorted;
}

/**
 * Convert values for better sorting.
 */
function getSortValue(item, field) {
  const value = item[field] || '';

  if (field.toLowerCase().includes('date')) {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  }

  if (field === 'Tracking Number') {
    const numberMatch = String(value).match(/\d+/);
    if (numberMatch) return Number(numberMatch[0]);
  }

  return String(value).trim().toLowerCase();
}

/**
 * Update sort arrows in table headers.
 */
function updateSortIndicators() {
  document.querySelectorAll('.sort-btn').forEach((button) => {
    const field = button.dataset.sort;
    const indicator = button.querySelector('.sort-indicator');

    button.classList.toggle('active', currentSort.field === field);

    if (!indicator) return;

    if (currentSort.field !== field) {
      indicator.textContent = '↕';
    } else {
      indicator.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
    }
  });
}

/**
 * Summary cards.
 */
function updateSummaryCards() {
  const total = allRequests.length;
  const open = allRequests.filter((item) => item.isOpen).length;
  const completed = allRequests.filter((item) => item.isCompleted).length;
  const unassigned = allRequests.filter((item) => item.isUnassigned).length;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('openCount').textContent = open;
  document.getElementById('completedCount').textContent = completed;
  document.getElementById('unassignedCount').textContent = unassigned;
}

/**
 * Empty state.
 */
function renderEmptyState(message) {
  document.getElementById('requestTableBody').innerHTML = `
    <tr>
      <td colspan="8" class="empty-cell">${escapeHtml(message)}</td>
    </tr>
  `;
}

/**
 * Open request modal.
 */
function openRequestModal(rowNumber) {
  selectedRequest = allRequests.find((item) => Number(item.rowNumber) === Number(rowNumber));

  if (!selectedRequest) {
    showToast('Request not found.', 'error');
    return;
  }

  document.getElementById('modalTitle').textContent =
    selectedRequest['Activity Proposal Title'] ||
    selectedRequest['Request'] ||
    'Untitled Request';

  document.getElementById('modalSubtitle').textContent =
    `${valueOrDash(selectedRequest.fullName)} • ${valueOrDash(selectedRequest['Office'])}`;

  populateEditFields(selectedRequest);
  populateDetailsGrid(selectedRequest);
  clearModalMessage();

  const modal = document.getElementById('requestModal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * Close modal.
 */
function closeModal() {
  const modal = document.getElementById('requestModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');

  selectedRequest = null;
}

/**
 * Put selected request values into editable form.
 */
function populateEditFields(request) {
  Object.entries(EDITABLE_FIELDS).forEach(([fieldName, elementId]) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.value = request[fieldName] || '';
  });
}

/**
 * Show full submitted details in modal.
 */
function populateDetailsGrid(request) {
  const grid = document.getElementById('requestDetailsGrid');

  grid.innerHTML = DETAIL_FIELDS.map((fieldName) => {
    const rawValue = request[fieldName] || '';
    const value = rawValue || '—';
    const isLong = String(value).length > 80 || ['Description', 'Caption', 'Remarks', 'Notes', 'Assets Drive Link', 'Project Link'].includes(fieldName);

    return `
      <div class="detail-item ${isLong ? 'full' : ''}">
        <span class="detail-label">${escapeHtml(fieldName)}</span>
        <div class="detail-value">${formatDetailValue(value)}</div>
      </div>
    `;
  }).join('');
}

/**
 * Save changes from modal.
 */
function handleSaveChanges() {
  if (!selectedRequest) {
    showToast('No selected request.', 'error');
    return;
  }

  const updates = collectEditFieldValues();

  setModalMessage('Saving changes...', '');

  callApi('updateRequest', {
    rowNumber: selectedRequest.rowNumber,
    updates: JSON.stringify(updates)
  })
    .then((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Unable to save changes.');
      }

      setModalMessage('Changes saved successfully.', 'success');
      showToast('Request updated successfully.', 'success');

      return callApi('getRequests');
    })
    .then((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Unable to reload requests.');
      }

      allRequests = response.requests || [];
      updateSummaryCards();

      selectedRequest = allRequests.find((item) => Number(item.rowNumber) === Number(selectedRequest.rowNumber));
      if (selectedRequest) {
        populateEditFields(selectedRequest);
        populateDetailsGrid(selectedRequest);
      }

      renderCurrentView();
    })
    .catch((error) => {
      console.error(error);
      setModalMessage(error.message || 'Unable to save changes.', 'error');
      showToast(error.message || 'Unable to save changes.', 'error');
    });
}

/**
 * Collect editable field values from modal.
 */
function collectEditFieldValues() {
  const updates = {};

  Object.entries(EDITABLE_FIELDS).forEach(([fieldName, elementId]) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    updates[fieldName] = element.value.trim();
  });

  return updates;
}

/**
 * Mark selected request as completed.
 */
function handleMarkCompleted() {
  if (!selectedRequest) {
    showToast('No selected request.', 'error');
    return;
  }

  const confirmed = window.confirm(
    'Mark this request as completed? This will set Ticket to Closed and email tracking columns to Sent.'
  );

  if (!confirmed) return;

  showLoading('Marking request as completed...');
  setModalMessage('Marking as completed...', '');

  callApi('markCompleted', {
    rowNumber: selectedRequest.rowNumber
  })
    .then((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Unable to mark request as completed.');
      }

      showToast('Request marked as completed.', 'success');
      setModalMessage('Request marked as completed.', 'success');

      return callApi('getRequests');
    })
    .then((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Unable to reload requests.');
      }

      allRequests = response.requests || [];
      updateSummaryCards();

      selectedRequest = allRequests.find((item) => Number(item.rowNumber) === Number(selectedRequest.rowNumber));
      if (selectedRequest) {
        populateEditFields(selectedRequest);
        populateDetailsGrid(selectedRequest);
      }

      renderCurrentView();
    })
    .catch((error) => {
      console.error(error);
      showToast(error.message || 'Unable to complete request.', 'error');
      setModalMessage(error.message || 'Unable to complete request.', 'error');
    })
    .finally(() => {
      hideLoading();
    });
}

/**
 * Call Apps Script API using JSONP.
 * This avoids common CORS issues when frontend is hosted on GitHub Pages.
 */
function callApi(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `oscCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const queryParams = new URLSearchParams();
    queryParams.set('action', action);
    queryParams.set('callback', callbackName);

    Object.entries(params).forEach(([key, value]) => {
      queryParams.set(key, value);
    });

    const script = document.createElement('script');
    script.src = `${API_URL}?${queryParams.toString()}`;
    script.async = true;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Request timed out. Please check your Apps Script Web App URL or deployment permissions.'));
    }, 30000);

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Unable to connect to Apps Script API.'));
    };

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    document.body.appendChild(script);
  });
}

/**
 * Check if API URL was already configured.
 */
function isApiConfigured() {
  if (!API_URL || API_URL.includes('PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    renderEmptyState('Please paste your Apps Script Web App URL inside script.js first.');
    showToast('Apps Script Web App URL is not configured yet.', 'error');
    return false;
  }

  return true;
}

/**
 * Create status badge.
 */
function createStatusBadge(status) {
  const cleanStatus = valueOrDefault(status, 'Pending');
  const className = statusToClass(cleanStatus);

  return `<span class="badge ${className}">${escapeHtml(cleanStatus)}</span>`;
}

/**
 * Create ticket badge.
 */
function createTicketBadge(ticket) {
  const cleanTicket = valueOrDefault(ticket, 'Open');
  const normalized = normalize(cleanTicket);

  let className = 'blank';

  if (normalized === 'open') className = 'open';
  if (normalized === 'closed') className = 'closed';

  return `<span class="badge ${className}">${escapeHtml(cleanTicket)}</span>`;
}

/**
 * Convert status text to CSS class.
 */
function statusToClass(status) {
  const normalized = normalize(status);

  const map = {
    'pending': 'pending',
    'in progress': 'in-progress',
    'for review': 'for-review',
    'revision': 'revision',
    'completed': 'completed',
    'on hold': 'on-hold',
    'cancelled': 'cancelled'
  };

  return map[normalized] || 'blank';
}

/**
 * Format value in details grid.
 */
function formatDetailValue(value) {
  const text = String(value || '—');

  if (isUrl(text)) {
    return `<a href="${escapeAttribute(text)}" target="_blank" rel="noopener noreferrer">Open Link</a>`;
  }

  return escapeHtml(text);
}

/**
 * Loading overlay.
 */
function showLoading(message = 'Loading...') {
  document.getElementById('loadingText').textContent = message;
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

/**
 * Modal message.
 */
function setModalMessage(message, type = '') {
  const messageEl = document.getElementById('modalMessage');
  messageEl.textContent = message;
  messageEl.className = type || '';
}

function clearModalMessage() {
  setModalMessage('', '');
}

/**
 * Toast message.
 */
let toastTimeout = null;

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  toastMessage.textContent = message;
  toast.className = `toast ${type}`.trim();
  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

/**
 * Helpers
 */
function valueOrDash(value) {
  return value && String(value).trim() ? String(value).trim() : '—';
}

function valueOrDefault(value, fallback) {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function isUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || '').trim());
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
