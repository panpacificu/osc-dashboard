/* OSC Statistics — v1.4.0. Uses existing Dashboard Apps Script endpoint. */
(() => {
  'use strict';
  const CFG = window.OSC_DASHBOARD_CONFIG || {};
  const API_URL = CFG.API_URL || '';
  const SDG_NAMES = [
    'No Poverty', 'Zero Hunger', 'Good Health', 'Quality Education', 'Gender Equality',
    'Clean Water', 'Clean Energy', 'Decent Work', 'Industry & Innovation',
    'Reduced Inequalities', 'Sustainable Cities', 'Responsible Consumption',
    'Climate Action', 'Life Below Water', 'Life on Land', 'Peace & Justice', 'Partnerships'
  ];
  const selectedSdgs = new Set();
  let allRequests = [];
  let filtered = [];
  let visibleLimit = 100;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const clean = (v) => String(v == null ? '' : v).trim();
  const norm = (v) => clean(v).toLowerCase();
  const isArchived = (r) => ['yes','true','archived','hidden'].includes(norm(r.Archived));
  const isCompleted = (r) => norm(r.Ticket) === 'closed' || norm(r.Status) === 'completed';
  const isOpen = (r) => norm(r.Ticket) === 'open' && !isCompleted(r);
  const isUnassigned = (r) => !clean(r.Assigned) || !clean(r.Ticket);
  const links = (r) => clean(r['Facebook Post Links']).split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);

  function parseSdgs(raw) {
    const str = clean(raw);
    const ids = new Set();
    for (const match of str.matchAll(/\b(?:SDG|GOAL)\s*[-:#]?\s*0?([1-9]|1[0-7])\b/gi)) {
      ids.add(Number(match[1]));
    }
    // Also handles mixed shorthand such as "SDG 1, 3" or "SDG 1 and 3".
    if (ids.size) {
      for (const match of str.matchAll(/(?:[,;|&]\s*|\band\s+)0?([1-9]|1[0-7])\b/gi)) {
        ids.add(Number(match[1]));
      }
    }
    // Supports a sheet cell containing only a simple list of numbers: "1, 3".
    if (!ids.size && /^[\d\s,;/|]+$/.test(str)) {
      str.split(/[,;/|\s]+/).filter(Boolean).map(Number).filter(n => n >= 1 && n <= 17).forEach(n => ids.add(n));
    }
    // Handle full SDG labels when the column does not include a numeric ID.
    if (!ids.size) {
      const lowered = str.toLowerCase();
      SDG_NAMES.forEach((label, idx) => { if (lowered.includes(label.toLowerCase())) ids.add(idx + 1); });
    }
    return [...ids].sort((a,b) => a-b);
  }

  function parseDate(raw) {
    const str = clean(raw);
    const iso = str.match(/^(\d{4})-(\d\d)-(\d\d)/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const date = new Date(str.replace(/\s*\|\s*/, ' '));
    if (Number.isNaN(date.valueOf())) return '';
    const year = date.getFullYear();
    return `${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function callApi(action, payload = {}) {
    if (!API_URL) return Promise.reject(new Error('Missing API_URL in your existing config.js.'));
    return new Promise((resolve, reject) => {
      const callback = `oscStats_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const params = new URLSearchParams({action, callback, ...payload});
      const script = document.createElement('script');
      const timer = setTimeout(() => { finish(); reject(new Error('Dashboard API timed out.')); }, 30000);
      function finish() { clearTimeout(timer); delete window[callback]; script.remove(); }
      window[callback] = data => { finish(); resolve(data); };
      script.onerror = () => { finish(); reject(new Error('Could not reach Dashboard API.')); };
      script.src = `${API_URL}?${params}`;
      script.async = true;
      document.body.appendChild(script);
    });
  }

  function baseScope() {
    const from = $('dateFrom').value;
    const to = $('dateTo').value;
    const status = norm($('statsStatus').value);
    return allRequests.filter(r => {
      if (!$('includeArchived').checked && isArchived(r)) return false;
      if (status && norm(r.Status) !== status) return false;
      const date = parseDate(r.Timestamp);
      if (from && (!date || date < from)) return false;
      if (to && (!date || date > to)) return false;
      return true;
    });
  }

  function renderSdgs(scope) {
    const counts = Array(17).fill(0);
    scope.forEach(r => parseSdgs(r.SDG).forEach(n => counts[n-1]++));
    $('sdgGrid').innerHTML = SDG_NAMES.map((name, index) => {
      const n = index+1;
      return `<button type="button" class="sdg-chip${selectedSdgs.has(n)?' selected':''}" data-sdg="${n}" aria-pressed="${selectedSdgs.has(n)}" title="SDG ${n}: ${esc(name)}"><span><span class="sdg-chip-num">SDG ${n}</span><span class="sdg-chip-name">${esc(name)}</span></span><span class="sdg-chip-count">${counts[index]}</span></button>`;
    }).join('');
    const selected = [...selectedSdgs].sort((a,b) => a-b);
    $('sdgSelectionText').textContent = selected.length
      ? `Showing requests containing ALL selected goals: ${selected.map(n=>`SDG ${n}`).join(' + ')}`
      : 'No SDGs selected — showing all requests in scope.';
    $('sdgScopeCount').textContent = `${scope.length} requests in scope`;
  }

  function renderKpis(rows) {
    const published = rows.filter(r => links(r).length).length;
    const totalPosts = rows.reduce((sum, r) => sum + links(r).length, 0);
    const stats = [
      ['Matching requests', rows.length],
      ['Open projects', rows.filter(isOpen).length],
      ['Completed', rows.filter(isCompleted).length],
      ['Unassigned', rows.filter(isUnassigned).length],
      ['With Facebook links', published],
      ['Published post URLs', totalPosts]
    ];
    $('statKpis').innerHTML = stats.map(([name, value]) => `<div class="workspace-kpi"><strong>${value}</strong><span>${esc(name)}</span></div>`).join('');
  }

  function renderTable() {
    const rows = filtered.slice(0, visibleLimit);
    const selected = selectedSdgs;
    $('matchingCount').textContent = `${filtered.length} matches`;
    $('matchExplanation').textContent = selected.size
      ? 'Every result includes all selected SDGs, even when it has additional SDGs.'
      : 'Showing requests based on the selected date, status and archive scope.';
    $('matchingRequestsBody').innerHTML = rows.length ? rows.map(r => {
      const tracking = clean(r['Tracking Number']);
      const title = clean(r.Purpose || r['Activity Proposal Title'] || r.Request || 'Untitled request');
      const sdgs = parseSdgs(r.SDG);
      const tags = sdgs.length ? `<span class="sdg-tags">${sdgs.map(n=>`<span class="sdg-mini-tag ${selected.has(n)?'target':''}">SDG ${n}</span>`).join('')}</span>` : '—';
      return `<tr><td><a href="index.html?tracking=${encodeURIComponent(tracking)}">${esc(tracking)}</a></td><td class="title-cell">${esc(title)}</td><td>${esc(r.Office||'—')}</td><td>${tags}</td><td>${esc(r.Status||'Pending')}</td><td>${esc(r.Timestamp||'—')}</td><td><a href="index.html?tracking=${encodeURIComponent(tracking)}">View ↗</a></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="workspace-empty">No requests match this combination.</td></tr>';
    $('visibleRequestsNote').textContent = `Showing ${rows.length} of ${filtered.length} requests`;
    $('showMoreRequests').hidden = rows.length >= filtered.length;
  }

  function countBy(rows, key) {
    const map = new Map();
    rows.forEach(r => {
      const label = clean(r[key]) || 'Unspecified';
      map.set(label, (map.get(label)||0)+1);
    });
    return [...map.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function requestedOutputCounts(rows) {
    const counts = new Map();
    rows.forEach(r => {
      const parts = clean(r.Request).split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
      if (!parts.length) parts.push('Unspecified');
      parts.forEach(label => counts.set(label,(counts.get(label)||0)+1));
    });
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function renderBars(id, data) {
    const container = $(id);
    if (!data.length) { container.innerHTML='<p class="workspace-empty">No data available.</p>'; return; }
    const peak = Math.max(...data.map(x=>x[1]),1);
    container.innerHTML = data.slice(0,15).map(([label,n]) => `<div><div class="workspace-bar-head"><span>${esc(label)}</span><strong>${n}</strong></div><div class="workspace-bar-track"><div class="workspace-bar-fill" style="width:${(n/peak*100).toFixed(1)}%"></div></div></div>`).join('');
  }

  function refreshScreen() {
    const scope = baseScope();
    renderSdgs(scope);
    filtered = selectedSdgs.size
      ? scope.filter(r => { const matches = parseSdgs(r.SDG); return [...selectedSdgs].every(n => matches.includes(n)); })
      : scope;
    visibleLimit=100;
    renderKpis(filtered);
    renderTable();
    renderBars('staffBreakdown', countBy(filtered.filter(isCompleted),'Assigned'));
    renderBars('typeBreakdown', countBy(filtered, 'Request Type'));
    renderBars('officeBreakdown', countBy(filtered,'Office'));
    renderBars('outputBreakdown', requestedOutputCounts(filtered));
  }

  async function loadRequests() {
    $('statsRefresh').disabled=true;
    $('statsStatusLine').className='workspace-feedback';
    $('statsStatusLine').textContent='Loading live request data…';
    try {
      const result = await callApi('getRequests');
      if (!result.success) throw new Error(result.message || 'Dashboard request load failed.');
      allRequests = result.requests || [];
      refreshScreen();
      $('statsStatusLine').textContent = `Loaded ${allRequests.length} request records. SDG selections use AND matching.`;
    } catch(e) {
      $('statsStatusLine').textContent=e.message;
      $('statsStatusLine').className='workspace-feedback error';
    } finally {
      $('statsRefresh').disabled=false;
    }
  }

  async function loadFormStatus() {
    try {
      const data=await callApi('getFormStatus');
      if (!data.success) throw new Error(data.message || 'Form status unavailable.');
      $('statsFormToggle').checked = !!data.enabled;
      $('statsFormToggle').disabled=false;
      $('statsClosedMessage').value=data.message||'';
      $('statsClosedMessage').disabled=false;
      $('saveStatsFormMessage').disabled=false;
      $('availabilityState').textContent = data.enabled ? 'OPEN' : 'CLOSED';
      $('availabilityState').className=`form-availability-badge ${data.enabled?'open':'closed'}`;
    } catch(e) {
      $('formControlFeedback').textContent=e.message;
      $('availabilityState').textContent='Unavailable';
      $('availabilityState').className='form-availability-badge loading';
    }
  }

  async function setFormStatus() {
    $('statsFormToggle').disabled=true;
    $('saveStatsFormMessage').disabled=true;
    $('formControlFeedback').textContent='Saving…';
    try {
      const result=await callApi('setFormStatus', {
        enabled:String($('statsFormToggle').checked),
        message:$('statsClosedMessage').value
      });
      if (!result.success) throw new Error(result.message||'Could not update form availability.');
      $('formControlFeedback').textContent='Saved successfully.';
      $('availabilityState').textContent=result.enabled?'OPEN':'CLOSED';
      $('availabilityState').className=`form-availability-badge ${result.enabled?'open':'closed'}`;
    } catch(e) {
      $('formControlFeedback').textContent=e.message;
      await loadFormStatus(); // Restore server-confirmed toggle value.
    } finally {
      $('statsFormToggle').disabled=false;
      $('saveStatsFormMessage').disabled=false;
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    $('sdgGrid').addEventListener('click',event=>{
      const button=event.target.closest('[data-sdg]');
      if (!button) return;
      const number=Number(button.dataset.sdg);
      if (selectedSdgs.has(number)) selectedSdgs.delete(number); else selectedSdgs.add(number);
      refreshScreen();
    });
    $('clearSdgs').addEventListener('click',()=>{selectedSdgs.clear();refreshScreen();});
    ['dateFrom','dateTo','statsStatus','includeArchived'].forEach(id=> $(id).addEventListener('change',refreshScreen));
    $('statsRefresh').addEventListener('click',loadRequests);
    $('showMoreRequests').addEventListener('click',()=>{visibleLimit+=100;renderTable();});
    $('statsFormToggle').addEventListener('change',setFormStatus);
    $('saveStatsFormMessage').addEventListener('click',setFormStatus);
    renderSdgs([]);
    loadRequests();
    loadFormStatus();
  });
})();
