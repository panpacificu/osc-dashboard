/* OSC Facebook Posts — v1.4.0. Append-only link entry workflow. */
(() => {
  'use strict';
  const API_URL = (window.OSC_DASHBOARD_CONFIG || {}).API_URL || '';
  const $ = id => document.getElementById(id);
  const text = value => String(value == null ? '' : value).trim();
  const esc = value => text(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  let rows = [];
  let selected = null;
  let saving = false;
  const initialTracking = new URLSearchParams(window.location.search).get('tracking') || '';

  function linksOf(row) {
    return text(row && row['Facebook Post Links']).split(/[\n\r,;]+/).map(s=>s.trim()).filter(Boolean);
  }
  function callApi(action, params={}) {
    if (!API_URL) return Promise.reject(new Error('Dashboard API is missing. Keep the existing working config.js.'));
    return new Promise((resolve,reject)=>{
      const callback=`oscPost_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
      const query=new URLSearchParams({action,callback,...params});
      const script=document.createElement('script');
      const timer=setTimeout(()=>{cleanup();reject(new Error('Dashboard API request timed out.'));},30000);
      function cleanup(){clearTimeout(timer);delete window[callback];script.remove();}
      window[callback]=data=>{cleanup();resolve(data);};
      script.onerror=()=>{cleanup();reject(new Error('Unable to reach the Dashboard backend.'));};
      script.src=`${API_URL}?${query}`;
      script.async=true;
      document.body.appendChild(script);
    });
  }
  function setFeedback(message,type='') {
    $('saveLinksFeedback').textContent=message;
    $('saveLinksFeedback').className=`workspace-feedback ${type}`;
  }
  function validFacebookUrl(value) {
    try {
      const u=new URL(value);
      return u.protocol==='https:' && (
        u.hostname==='facebook.com'||u.hostname.endsWith('.facebook.com')||u.hostname==='fb.watch'||u.hostname==='www.fb.watch'
      );
    } catch(_){return false;}
  }
  function renderResults() {
    const needle=text($('postRequestSearch').value).toLowerCase();
    const matched=rows.filter(r=>[
      r['Tracking Number'], r.Purpose, r['Activity Proposal Title'], r.Request,
      r.Office, r.fullName, r['First Name'], r['Last Name']
    ].join(' ').toLowerCase().includes(needle)).slice(0,50);
    $('postSearchStatus').textContent = `${matched.length} ${matched.length===50?'first ':''}matching requests shown. Click Select to log a post.`;
    $('postRequestResults').innerHTML=matched.length?matched.map(r=>{
      const rid=text(r['Tracking Number']);
      const title=text(r.Purpose||r['Activity Proposal Title']||r.Request||'Untitled request');
      const isCurrent=selected && text(selected['Tracking Number'])===rid;
      return `<div class="post-result ${isCurrent?'active':''}"><div><strong>${esc(rid)}</strong><span>${esc(title)}</span><span>${esc(r.Office)} · ${linksOf(r).length} posts</span></div><button type="button" data-rid="${esc(rid)}">${isCurrent?'Selected':'Select'}</button></div>`;
    }).join(''):'<p class="workspace-empty">No matching requests.</p>';
  }
  function renderExisting() {
    const container=$('existingPostLinks');
    if (!selected) {container.innerHTML='<p class="workspace-empty">No request selected.</p>';return;}
    const links=linksOf(selected);
    container.innerHTML=links.length?links.map((url, index)=>{
      // Only render URLs on trusted HTTPS Facebook domains.
      return validFacebookUrl(url)
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${index+1}. ${esc(url)} ↗</a>`
        : `<span class="workspace-feedback">${index+1}. Saved non-Facebook URL (not linked): ${esc(url)}</span>`;
    }).join(''):'<p class="workspace-empty">No Facebook links logged yet.</p>';
  }
  function selectRequest(rid) {
    selected=rows.find(r=>text(r['Tracking Number']).toUpperCase()===rid.toUpperCase())||null;
    if (!selected) return;
    $('selectedPostTitle').textContent=`${text(selected['Tracking Number'])} — ${text(selected.Purpose||selected['Activity Proposal Title']||selected.Request||'Untitled request')}`;
    $('selectedPostDescription').textContent=`${text(selected.Office||'No office')} · ${text(selected.Status||'Pending')}`;
    $('openSelectedDashboard').href=`index.html?tracking=${encodeURIComponent(text(selected['Tracking Number']))}`;
    $('openSelectedDashboard').hidden=false;
    $('postLinksInput').disabled=false;
    $('internPostCode').disabled=false;
    $('savePostLinks').disabled=false;
    renderResults();
    renderExisting();
    setFeedback('');
  }
  async function loadRequests() {
    $('reloadPosts').disabled=true;
    $('postSearchStatus').textContent='Loading request data…';
    try {
      const result=await callApi('getRequests');
      if (!result.success) throw new Error(result.message||'Could not load requests.');
      rows=result.requests||[];
      renderResults();
      const target=selected?text(selected['Tracking Number']):initialTracking;
      if(target) selectRequest(target);
    } catch(e) {$('postSearchStatus').textContent=e.message;setFeedback(e.message,'error');}
    finally {$('reloadPosts').disabled=false;}
  }
  async function saveLinks(event) {
    event.preventDefault();
    if (saving) return;
    if (!selected){setFeedback('Select a request before adding links.','error');return;}
    const input=text($('postLinksInput').value);
    const urls=input.split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean);
    if (!urls.length || urls.length>25){setFeedback('Add 1–25 Facebook URLs, one per line.','error');return;}
    if (urls.some(url=>!validFacebookUrl(url))){setFeedback('Only full HTTPS Facebook and fb.watch links are accepted.','error');return;}
    const pin=$('internPostCode').value;
    if(!pin){setFeedback('Enter the access code provided by OSC.','error');return;}
    saving=true;$('savePostLinks').disabled=true;
    let added=0;
    let attempted=0;
    try{
      // One URL per JSONP call keeps GET requests short and avoids truncation.
      for(const url of urls){
        attempted++;
        setFeedback(`Saving link ${attempted} of ${urls.length}…`);
        const result=await callApi('addFacebookPostLinks',{
          tracking:text(selected['Tracking Number']),links:url,pin
        });
        if(!result.success) throw new Error(result.message||'Could not save this link.');
        added+=Number(result.added||0);
      }
      $('postLinksInput').value='';
      setFeedback(`Saved ${added} new link${added===1?'':'s'} (${urls.length-added} already existed).`,'success');
      const oldTracking=text(selected['Tracking Number']);
      const loaded=await callApi('getRequests');
      if(loaded.success){rows=loaded.requests||[];selectRequest(oldTracking);setFeedback(`Saved ${added} new Facebook post link${added===1?'':'s'}.`,'success');}
    } catch(e){setFeedback(`Saved ${attempted>1?attempted-1:0} previous link(s) before this error: ${e.message}`,'error');}
    finally{saving=false;$('savePostLinks').disabled=false;}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('postRequestSearch').value=initialTracking;
    $('postRequestSearch').addEventListener('input',renderResults);
    $('postRequestResults').addEventListener('click',event=>{
      const button=event.target.closest('button[data-rid]');
      if(button) selectRequest(button.dataset.rid);
    });
    $('reloadPosts').addEventListener('click',loadRequests);
    $('postLinkForm').addEventListener('submit',saveLinks);
    loadRequests();
  });
})();
