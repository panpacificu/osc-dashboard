/* OSC SDG Explorer v1.5.0 — goal intersection, clean request list */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const API_URL = (window.OSC_DASHBOARD_CONFIG || {}).API_URL || '';
  const GOALS = [
    'No Poverty', 'Zero Hunger', 'Good Health and Well-Being', 'Quality Education',
    'Gender Equality', 'Clean Water and Sanitation', 'Affordable and Clean Energy',
    'Decent Work and Economic Growth', 'Industry, Innovation and Infrastructure',
    'Reduced Inequalities', 'Sustainable Cities and Communities',
    'Responsible Consumption and Production', 'Climate Action', 'Life Below Water',
    'Life on Land', 'Peace, Justice and Strong Institutions', 'Partnerships for the Goals'
  ];
  const selected = new Set();
  let allRows = [];
  let results = [];
  let limit = 60;
  const str = x => String(x == null ? '' : x).trim();
  const norm = x => str(x).toLowerCase();
  const esc = x => str(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const archived = r => /^(yes|true|archived|hidden)$/.test(norm(r.Archived));
  const titleOf = r => str(r.Purpose || r['Activity Proposal Title'] || r.Request || 'Untitled request');

  function parseSdgs(raw) {
    const value = str(raw);
    const found = new Set();
    // Explicit SDG identifiers and mixed shorthand, including "SDG 1, 3, 4".
    for (const match of value.matchAll(/\b(?:SDG|GOAL)\s*[-:#]?\s*(0?(?:1[0-7]|[1-9]))((?:\s*(?:,|;|\/|\+|&|\band\b)\s*0?(?:1[0-7]|[1-9]))*)/gi)) {
      const n = Number(match[1]);
      if (n >= 1 && n <= 17) found.add(n);
      for (const part of (match[2] || '').matchAll(/\b(1[0-7]|[1-9])\b/g)) {
        const other = Number(part[1]);
        if (other >= 1 && other <= 17) found.add(other);
      }
    }
    if (/^\s*\d{1,2}(?:\s*[,;|/&+]\s*\d{1,2})*\s*$/.test(value)) {
      for (const token of value.split(/[,;|/&+]/)) {
        const n = Number(token.trim());
        if (n >= 1 && n <= 17) found.add(n);
      }
    }
    const aliases = [
      ['no poverty'],['zero hunger'],['good health','well-being'],['quality education'],
      ['gender equality'],['clean water'],['clean energy','affordable and clean energy'],
      ['decent work'],['industry, innovation','industry and innovation'],['reduced inequalities'],
      ['sustainable cities'],['responsible consumption'],['climate action'],
      ['life below water'],['life on land'],['peace, justice','peace and justice'],['partnerships']
    ];
    aliases.forEach((list,i)=>{ if (list.some(alias=>norm(value).includes(alias))) found.add(i+1); });
    return [...found].sort((a,b)=>a-b);
  }
  function callApi(action) {
    if (!API_URL) return Promise.reject(new Error('Dashboard API_URL is missing from config.js.'));
    return new Promise((resolve,reject) => {
      const name = `oscSdg_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
      const node = document.createElement('script');
      const timeout = setTimeout(()=>{done();reject(new Error('Connection timed out.'));},30000);
      function done(){clearTimeout(timeout);delete window[name];node.remove();}
      window[name]=data=>{done();resolve(data);};
      node.onerror=()=>{done();reject(new Error('Could not reach OSC backend.'));};
      node.src=`${API_URL}?${new URLSearchParams({action,callback:name})}`;
      document.body.appendChild(node);
    });
  }
  function inScope(row) { return $('includeArchived').checked || !archived(row); }
  function matchesSelected(row) {
    const ids = parseSdgs(row.SDG);
    return [...selected].every(id=>ids.includes(id));
  }
  function renderGoals() {
    const scope = allRows.filter(inScope);
    const counts = Array(17).fill(0);
    scope.forEach(r=>parseSdgs(r.SDG).forEach(n=>counts[n-1]++));
    $('sdgGrid').innerHTML=GOALS.map((name,i)=>{
      const n=i+1; const active=selected.has(n);
      return `<button type="button" class="sdg-pick${active?' active':''}" data-goal="${n}" aria-pressed="${active}" title="SDG ${n}: ${esc(name)}">
        <span class="sdg-pick-number">${String(n).padStart(2,'0')}</span><span class="sdg-pick-title">${esc(name)}</span><span class="sdg-pick-total">${counts[i]}</span></button>`;
    }).join('');
  }
  function render() {
    renderGoals();
    const query=norm($('sdgSearch').value);
    results=allRows.filter(row=>{
      if(!inScope(row) || !matchesSelected(row))return false;
      if(!query)return true;
      return norm(`${row['Tracking Number']} ${titleOf(row)}`).includes(query);
    });
    $('sdgSelectionText').textContent=selected.size
      ? [...selected].sort((a,b)=>a-b).map(x=>'SDG '+x).join(' + ') + ' · all required'
      : 'All goals · select to narrow';
    $('sdgCount').textContent=`${results.length} matching`;
    $('resultCount').textContent=String(results.length);
    $('sdgStatus').textContent = allRows.length ? '' : 'No records yet.';
    const displayed=results.slice(0,limit);
    $('sdgResults').innerHTML=displayed.length ? displayed.map(row=>{
      const rid=str(row['Tracking Number']);
      const ids=parseSdgs(row.SDG);
      const tags=ids.map(id=>`<span class="sdg-result-badge${selected.has(id)?' selected':''}">${id}</span>`).join('') || '<span class="no-sdg">Not tagged</span>';
      const href=`index.html?tracking=${encodeURIComponent(rid)}`;
      return `<article class="sdg-result-item"><div class="sdg-result-main"><span class="sdg-result-rid">${esc(rid||'—')}</span><h3>${esc(titleOf(row))}</h3></div>
        <div class="sdg-result-goals" aria-label="Sustainable Development Goals">${tags}</div><a class="sdg-open-request" href="${href}" title="Open ${esc(rid)}" aria-label="Open ${esc(rid)} in request dashboard">↗</a></article>`;
    }).join('') : '<p class="sdg-no-results">No matching requests. Try a different SDG combination.</p>';
    $('sdgShowMore').hidden=displayed.length>=results.length;
  }
  async function load() {
    $('sdgStatus').textContent='Loading requests…';
    try {
      const data=await callApi('getRequests');
      if(!data.success) throw new Error(data.message||'Could not load requests.');
      allRows=data.requests||[];
      render();
    } catch(error) {
      $('sdgStatus').textContent=error.message;
      $('sdgStatus').classList.add('error');
      $('sdgResults').innerHTML='';
    }
  }
  $('sdgGrid').addEventListener('click',event=>{
    const button=event.target.closest('[data-goal]'); if(!button)return;
    const n=Number(button.dataset.goal);
    if(selected.has(n))selected.delete(n);else selected.add(n);
    limit=60;render();
  });
  $('clearSdgs').addEventListener('click',()=>{selected.clear();limit=60;render();});
  $('sdgSearch').addEventListener('input',()=>{limit=60;render();});
  $('includeArchived').addEventListener('change',()=>{limit=60;render();});
  $('sdgShowMore').addEventListener('click',()=>{limit+=60;render();});
  load();
})();
