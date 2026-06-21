/****************************************************
 * OSC REQUEST MANAGEMENT DASHBOARD
 * Frontend: GitHub Pages
 * Backend: Google Apps Script Web App
 ****************************************************/

const DASHBOARD_CONFIG = window.OSC_DASHBOARD_CONFIG || {};

const API_URL = DASHBOARD_CONFIG.API_URL || '';
const APP_VERSION = DASHBOARD_CONFIG.APP_VERSION || 'v1.3.3';
const LAST_UPDATED = DASHBOARD_CONFIG.LAST_UPDATED || '';
const CHANGELOG = Array.isArray(DASHBOARD_CONFIG.CHANGELOG)
  ? DASHBOARD_CONFIG.CHANGELOG
  : [];

let allRequests = [];
let currentView = 'open';
let selectedRequest = null;
let adminSummaryDirty = true;
let searchDebounceTimer = null;
let changelogRendered = false;

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
  updateFooterInfo();
  refreshDashboard();
});

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(renderCurrentView, 160);
  });
  document.getElementById('statusFilter').addEventListener('change', renderCurrentView);

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  document.querySelectorAll('.sort-btn').forEach((button) => {
    button.addEventListener('click', () => handleSort(button.dataset.sort));
  });

  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  document.getElementById('saveChangesBtn').addEventListener('click', handleSaveChanges);
  document.getElementById('markCompletedBtn').addEventListener('click', handleMarkCompleted);

  document.getElementById('floatingRefreshBtn').addEventListener('click', refreshDashboard);

  document.getElementById('adminSummaryToggle').addEventListener('click', toggleAdminSummary);
  document.getElementById('adminSummaryClose').addEventListener('click', closeAdminSummary);
  document.getElementById('adminDrawerOverlay').addEventListener('click', closeAdminSummary);

  document.getElementById('changelogToggle').addEventListener('click', toggleChangelog);
  document.getElementById('changelogClose').addEventListener('click', closeChangelog);
  document.getElementById('changelogDrawerOverlay').addEventListener('click', closeChangelog);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      closeAdminSummary();
      closeChangelog();
    }
  });
}

function refreshDashboard() {
  if (!isApiConfigured()) return;

  setRefreshButtonState(true);
  showLoading('Loading requests...');

  callApi('getRequests')
    .then((response) => {
      if (!response.success) {
        throw new Error(response.message || 'Unable to load requests.');
      }

      allRequests = normalizeLoadedRequests(response.requests || []);

      adminSummaryDirty = true;
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
      setRefreshButtonState(false);
      hideLoading();
    });
}

function normalizeLoadedRequests(requests) {
  return requests.map((item) => {
    item.requestDisplayTitle = getRequestTitle(item);
    return item;
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

      allRequests = normalizeLoadedRequests(response.requests || []);

      adminSummaryDirty = true;
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
    'Mark this request as completed? This will set Ticket to Closed, send the closing email if not yet sent, and send a chat notification if webhook is configured.'
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

      allRequests = normalizeLoadedRequests(response.requests || []);

      adminSummaryDirty = true;
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

/****************************************************
 * ADMIN SUMMARY
 ****************************************************/

function toggleAdminSummary() {
  const panel = document.getElementById('adminSummaryPanel');

  if (panel.classList.contains('open')) {
    closeAdminSummary();
  } else {
    openAdminSummary();
  }
}

function openAdminSummary() {
  closeChangelog();

  const panel = document.getElementById('adminSummaryPanel');
  const overlay = document.getElementById('adminDrawerOverlay');
  const toggle = document.getElementById('adminSummaryToggle');

  if (adminSummaryDirty) {
    renderAdminSummary();
  }

  panel.classList.add('open');
  overlay.classList.add('visible');
  panel.setAttribute('aria-hidden', 'false');
  overlay.setAttribute('aria-hidden', 'false');
  toggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('drawer-open');
}

function closeAdminSummary() {
  const panel = document.getElementById('adminSummaryPanel');
  const overlay = document.getElementById('adminDrawerOverlay');
  const toggle = document.getElementById('adminSummaryToggle');

  panel.classList.remove('open');
  overlay.classList.remove('visible');
  panel.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  if (!document.getElementById('changelogPanel').classList.contains('open')) {
    document.body.classList.remove('drawer-open');
  }
}

function renderAdminSummary() {
  renderOverviewStats();
  renderTopList('adminCompletedByStaff', countByField(allRequests.filter((item) => item.isCompleted), 'Assigned'), 8);
  renderTopList('adminRequestTypeStats', countByField(allRequests, 'Request Type'), 8);
  renderTopList('adminOfficeStats', countByField(allRequests, 'Office'), 8);
  renderTopList('adminOutputStats', countRequestedOutputs(allRequests), 10);
  adminSummaryDirty = false;
}

function renderOverviewStats() {
  const stats = [
    { label: 'Total', value: allRequests.length },
    { label: 'Open', value: allRequests.filter((item) => item.isOpen).length },
    { label: 'Completed', value: allRequests.filter((item) => item.isCompleted).length },
    { label: 'Unassigned', value: allRequests.filter((item) => item.isUnassigned).length },
    { label: 'Overdue', value: allRequests.filter((item) => item.isOverdue).length }
  ];

  document.getElementById('adminOverviewStats').innerHTML = stats.map((stat) => `
    <div class="mini-stat-card">
      <strong>${escapeHtml(stat.value)}</strong>
      <span>${escapeHtml(stat.label)}</span>
    </div>
  `).join('');
}

function countByField(requests, fieldName) {
  const counts = {};

  requests.forEach((request) => {
    const value = valueOrDefault(request[fieldName], 'Unspecified');
    counts[value] = (counts[value] || 0) + 1;
  });

  return counts;
}

function countRequestedOutputs(requests) {
  const counts = {};

  requests.forEach((request) => {
    const raw = request['Request'] || 'Unspecified';

    String(raw)
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        counts[item] = (counts[item] || 0) + 1;
      });
  });

  return counts;
}

function renderTopList(elementId, countObject, limit = 8) {
  const container = document.getElementById(elementId);
  if (!container) return;

  const entries = Object.entries(countObject)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (!entries.length) {
    container.innerHTML = '<p class="summary-empty">No data yet.</p>';
    return;
  }

  const maxValue = Math.max(...entries.map((entry) => entry[1]), 1);

  container.innerHTML = entries.map(([label, value]) => {
    const width = Math.max((value / maxValue) * 100, 8);

    return `
      <div class="summary-list-item">
        <div class="summary-list-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
        <div class="summary-bar">
          <span style="width:${width}%"></span>
        </div>
      </div>
    `;
  }).join('');
}

/****************************************************
 * CHANGELOG DRAWER
 ****************************************************/

function toggleChangelog() {
  const panel = document.getElementById('changelogPanel');

  if (panel.classList.contains('open')) {
    closeChangelog();
  } else {
    openChangelog();
  }
}

function openChangelog() {
  closeAdminSummary();

  const panel = document.getElementById('changelogPanel');
  const overlay = document.getElementById('changelogDrawerOverlay');
  const toggle = document.getElementById('changelogToggle');

  if (!changelogRendered) {
    renderChangelog();
  }

  panel.classList.add('open');
  overlay.classList.add('visible');
  panel.setAttribute('aria-hidden', 'false');
  overlay.setAttribute('aria-hidden', 'false');
  toggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('drawer-open');
}

function closeChangelog() {
  const panel = document.getElementById('changelogPanel');
  const overlay = document.getElementById('changelogDrawerOverlay');
  const toggle = document.getElementById('changelogToggle');

  if (!panel || !overlay || !toggle) return;

  panel.classList.remove('open');
  overlay.classList.remove('visible');
  panel.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');

  if (!document.getElementById('adminSummaryPanel').classList.contains('open')) {
    document.body.classList.remove('drawer-open');
  }
}

function renderChangelog() {
  const container = document.getElementById('changelogList');

  if (!CHANGELOG.length) {
    container.innerHTML = '<p class="summary-empty">No changelog entries yet.</p>';
    changelogRendered = true;
    return;
  }

  container.innerHTML = CHANGELOG.map((entry, index) => {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    return `
      <article class="changelog-entry ${index === 0 ? 'latest' : ''}">
        <div class="changelog-entry-top">
          <span class="changelog-version">${escapeHtml(entry.version || 'Update')}</span>
          ${index === 0 ? '<span class="latest-badge">Latest</span>' : ''}
        </div>

        <p class="changelog-date">${escapeHtml(entry.date || '')}</p>
        <h3>${escapeHtml(entry.title || 'Dashboard Update')}</h3>

        <ul>
          ${changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('')}
        </ul>
      </article>
    `;
  }).join('');

  changelogRendered = true;
}

function setRefreshButtonState(isRefreshing) {
  const button = document.getElementById('floatingRefreshBtn');
  if (!button) return;

  button.disabled = isRefreshing;
  button.classList.toggle('is-refreshing', isRefreshing);
  button.setAttribute(
    'aria-label',
    isRefreshing ? 'Refreshing dashboard' : 'Refresh dashboard'
  );
}

/****************************************************
 * API + UI HELPERS
 ****************************************************/

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

function updateFooterInfo() {
  document.getElementById('footerVersion').textContent = APP_VERSION;

  if (LAST_UPDATED) {
    document.getElementById('footerUpdated').textContent = LAST_UPDATED;
    return;
  }

  const updated = document.lastModified
    ? new Date(document.lastModified)
    : new Date();

  document.getElementById('footerUpdated').textContent = updated.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
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
