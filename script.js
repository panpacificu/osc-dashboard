/****************************************************
 * OSC REQUEST MANAGEMENT DASHBOARD
 * Frontend: GitHub Pages
 * Backend: Google Apps Script Web App
 ****************************************************/

const API_URL = 'https://script.google.com/macros/s/AKfycbzsgRXSWTLEwgRNE-hlIBBxGlQOaWCcLDu7MjX9EjbD34anGmt-OqH7nx7Ms9AQKWnOPA/exec';

let allRequests = [];
let currentView = 'open';
let selectedRequest = null;

let currentSort = {
  field: 'Date Needed',
  direction: 'asc'
};

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

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  refreshDashboard();
});

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
    if (event.key === 'Escape') closeModal();
  });
}

function refreshDashboard() {
  if (!isApiConfigured()) return;

  showLoading('Loading requests...');

  callApi('getRequests')
    .then((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Unable to load requests.');
      }

      allRequests = (response.requests || []).map((item) => {
        item.requestDisplayTitle = getRequestTitle(item);
        return item;
      });

      updateSummaryCards();
      renderNewRequestsPanel();
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

function switchView(view) {
  currentView = view;

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  updateViewHeader();
  renderCurrentView();
}

function updateViewHeader() {
  const title = document.getElementById('activeViewTitle');
  const subtitle = document.getElementById('activeViewSubtitle');

  const viewMap = {
    open: {
      title: 'Open Projects',
      subtitle: 'Requests that are already assigned and marked as Open.'
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
      subtitle: 'Requests that are not yet assigned or not yet opened.'
    }
  };

  title.textContent = viewMap[currentView].title;
  subtitle.textContent = viewMap[currentView].subtitle;
}

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

  document.getElementById('requestTableBody').innerHTML = requests
    .map((request) => createRequestRow(request, 'View / Edit'))
    .join('');
}

function renderNewRequestsPanel() {
  const panel = document.getElementById('newRequestsPanel');
  const countEl = document.getElementById('newRequestsCount');
  const tbody = document.getElementById('newRequestTableBody');

  if (!panel || !countEl || !tbody) return;

  const newRequests = allRequests
    .filter((item) => item.isUnassigned)
    .sort((a, b) => {
      const dateA = new Date(a['Timestamp']).getTime();
      const dateB = new Date(b['Timestamp']).getTime();

      if (Number.isNaN(dateA) && Number.isNaN(dateB)) return 0;
      if (Number.isNaN(dateA)) return 1;
      if (Number.isNaN(dateB)) return -1;

      return dateB - dateA;
    });

  if (!newRequests.length) {
    panel.classList.add('hidden');
    tbody.innerHTML = '';
    countEl.textContent = '0';
    return;
  }

  panel.classList.remove('hidden');
  countEl.textContent = newRequests.length;

  tbody.innerHTML = newRequests
    .map((request) => createRequestRow(request, 'Assign / Open'))
    .join('');
}

function createRequestRow(request, buttonLabel = 'View / Edit') {
  const trackingNumber = valueOrDash(request['Tracking Number']);
  const title = valueOrDash(getRequestTitle(request));
  const requester = valueOrDash(request.fullName);
  const office = valueOrDash(request['Office']);
  const dateNeeded = valueOrDash(request['Date Needed']);
  const status = valueOrDefault(request['Status'], 'Pending');
  const assigned = valueOrDefault(request['Assigned'], 'Unassigned');
  const ticket = valueOrDefault(request['Ticket'], 'Not Yet Opened');

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

      <td>${createStatusBadge(status)}</td>

      <td>
        <span class="${assignedClass}">
          ${escapeHtml(assigned)}
        </span>
      </td>

      <td>${createTicketBadge(ticket)}</td>

      <td>
        <button class="table-btn" type="button" onclick="openRequestModal(${request.rowNumber})">
          ${escapeHtml(buttonLabel)}
        </button>
      </td>
    </tr>
  `;
}

function getRequestTitle(request) {
  return (
    request['Purpose'] ||
    request['Activity Proposal Title'] ||
    request['Request'] ||
    'Untitled Request'
  );
}

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

function applySearchFilter(requests) {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  if (!query) return requests;

  return requests.filter((request) => {
    const searchableText = [
      request['Tracking Number'],
      request['Ticket'],
      request['Purpose'],
      request['Activity Proposal Title'],
      request['Request'],
      request['Description'],
      request['Office'],
      request['Request Type'],
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

function applyStatusFilter(requests) {
  const status = document.getElementById('statusFilter').value.trim().toLowerCase();

  if (!status) return requests;

  return requests.filter((request) => normalize(request['Status']) === status);
}

function handleSort(field) {
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.field = field;
    currentSort.direction = 'asc';
  }

  renderCurrentView();
}

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

function getSortValue(item, field) {
  if (field === 'requestDisplayTitle') {
    return getRequestTitle(item).trim().toLowerCase();
  }

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

function updateSummaryCards() {
  document.getElementById('totalCount').textContent = allRequests.length;
  document.getElementById('openCount').textContent = allRequests.filter((item) => item.isOpen).length;
  document.getElementById('completedCount').textContent = allRequests.filter((item) => item.isCompleted).length;
  document.getElementById('unassignedCount').textContent = allRequests.filter((item) => item.isUnassigned).length;
}

function renderEmptyState(message) {
  document.getElementById('requestTableBody').innerHTML = `
    <tr>
      <td colspan="8" class="empty-cell">${escapeHtml(message)}</td>
    </tr>
  `;
}

function openRequestModal(rowNumber) {
  selectedRequest = allRequests.find((item) => Number(item.rowNumber) === Number(rowNumber));

  if (!selectedRequest) {
    showToast('Request not found.', 'error');
    return;
  }

  document.getElementById('modalTitle').textContent = getRequestTitle(selectedRequest);
  document.getElementById('modalSubtitle').textContent =
    `${valueOrDash(selectedRequest.fullName)} • ${valueOrDash(selectedRequest['Office'])}`;

  populateEditFields(selectedRequest);
  populateDetailsGrid(selectedRequest);
  clearModalMessage();

  const modal = document.getElementById('requestModal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('requestModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');

  selectedRequest = null;
}

function populateEditFields(request) {
  Object.entries(EDITABLE_FIELDS).forEach(([fieldName, elementId]) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.value = request[fieldName] || '';
  });
}

function populateDetailsGrid(request) {
  const grid = document.getElementById('requestDetailsGrid');

  grid.innerHTML = DETAIL_FIELDS.map((fieldName) => {
    const rawValue = request[fieldName] || '';
    const value = rawValue || '—';

    const isLong = String(value).length > 80 || [
      'Description',
      'Caption',
      'Remarks',
      'Notes',
      'Assets Drive Link',
      'Project Link'
    ].includes(fieldName);

    return `
      <div class="detail-item ${isLong ? 'full' : ''}">
        <span class="detail-label">${escapeHtml(fieldName)}</span>
        <div class="detail-value">${formatDetailValue(value)}</div>
      </div>
    `;
  }).join('');
}

function handleSaveChanges() {
  if (!selectedRequest) {
    showToast('No selected request.', 'error');
    return;
  }

  const updates = collectEditFieldValues();

  setModalMessage('Saving changes...', '');
  showLoading('Saving changes...');

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

      const currentRowNumber = selectedRequest.rowNumber;

      allRequests = (response.requests || []).map((item) => {
        item.requestDisplayTitle = getRequestTitle(item);
        return item;
      });

      updateSummaryCards();
      renderNewRequestsPanel();

      selectedRequest = allRequests.find((item) => Number(item.rowNumber) === Number(currentRowNumber));

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
    })
    .finally(() => {
      hideLoading();
    });
}

function collectEditFieldValues() {
  const updates = {};

  Object.entries(EDITABLE_FIELDS).forEach(([fieldName, elementId]) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    updates[fieldName] = element.value.trim();
  });

  return updates;
}

function handleMarkCompleted() {
  if (!selectedRequest) {
    showToast('No selected request.', 'error');
    return;
  }

  const confirmed = window.confirm(
    'Mark this request as completed? This will set Ticket to Closed and send the closing email if not yet sent.'
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

      const currentRowNumber = selectedRequest.rowNumber;

      allRequests = (response.requests || []).map((item) => {
        item.requestDisplayTitle = getRequestTitle(item);
        return item;
      });

      updateSummaryCards();
      renderNewRequestsPanel();

      selectedRequest = allRequests.find((item) => Number(item.rowNumber) === Number(currentRowNumber));

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

function isApiConfigured() {
  if (!API_URL || API_URL.includes('PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    renderEmptyState('Please paste your Apps Script Web App URL inside script.js first.');
    showToast('Apps Script Web App URL is not configured yet.', 'error');
    return false;
  }

  return true;
}

function createStatusBadge(status) {
  const cleanStatus = valueOrDefault(status, 'Pending');
  const className = statusToClass(cleanStatus);

  return `<span class="badge ${className}">${escapeHtml(cleanStatus)}</span>`;
}

function createTicketBadge(ticket) {
  const cleanTicket = valueOrDefault(ticket, 'Not Yet Opened');
  const normalized = normalize(cleanTicket);

  let className = 'blank';

  if (normalized === 'open') className = 'open';
  if (normalized === 'closed') className = 'closed';

  return `<span class="badge ${className}">${escapeHtml(cleanTicket)}</span>`;
}

function statusToClass(status) {
  const normalized = normalize(status);

  const map = {
    'pending': 'pending',
    'ongoing': 'ongoing',
    'in progress': 'ongoing',
    'for review': 'for-review',
    'revision': 'revision',
    'completed': 'completed',
    'on hold': 'on-hold',
    'cancelled': 'cancelled'
  };

  return map[normalized] || 'blank';
}

function formatDetailValue(value) {
  const text = String(value || '—');

  if (isUrl(text)) {
    return `<a href="${escapeAttribute(text)}" target="_blank" rel="noopener noreferrer">Open Link</a>`;
  }

  return escapeHtml(text);
}

function showLoading(message = 'Loading...') {
  document.getElementById('loadingText').textContent = message;
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

function setModalMessage(message, type = '') {
  const messageEl = document.getElementById('modalMessage');
  messageEl.textContent = message;
  messageEl.className = type || '';
}

function clearModalMessage() {
  setModalMessage('', '');
}

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
