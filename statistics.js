/* OSC Statistics v1.5.0 — separate from SDG Explorer */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const API_URL=(window.OSC_DASHBOARD_CONFIG||{}).API_URL||'';
  const str=value=>String(value==null?'':value).trim();
  const norm=value=>str(value).toLowerCase();
  const esc=value=>str(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  let allRows=[];
  const archived=row=>/^(yes|true|archived|hidden)$/.test(norm(row.Archived));
  const completed=row=>norm(row.Ticket)==='closed'||norm(row.Status)==='completed';
  const open=row=>norm(row.Ticket)==='open'&&!completed(row);
  const unassigned=row=>!str(row.Ticket)||!str(row.Assigned);
  function callApi(action, params={}){
    if(!API_URL)return Promise.reject(new Error('Missing Dashboard API_URL in config.js.'));
    return new Promise((resolve,reject)=>{
      const callback=`oscMetrics_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const tag=document.createElement('script');
      const timer=setTimeout(()=>{clear();reject(new Error('API timed out.'));},30000);
      function clear(){clearTimeout(timer);delete window[callback];tag.remove();}
      window[callback]=data=>{clear();resolve(data);};
      tag.onerror=()=>{clear();reject(new Error('Unable to connect.'));};
      tag.src=`${API_URL}?${new URLSearchParams({action,callback,...params})}`;
      document.body.appendChild(tag);
    });
  }
  function iso(raw){
    const s=str(raw);const match=s.match(/^(\d{4}-\d\d-\d\d)/);
    if(match)return match[1];
    const d=new Date(s.replace(/\s*\|\s*/, ' '));
    if(!Number.isFinite(d.valueOf()))return '';
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function filtered(){
    const from=$('dateFrom').value,to=$('dateTo').value,status=norm($('statsStatus').value);
    return allRows.filter(r=>{
      if(!$('includeArchived').checked && archived(r))return false;
      if(status && norm(r.Status)!==status)return false;
      const date=iso(r.Timestamp);
      if(from&&(!date||date<from))return false;
      if(to&&(!date||date>to))return false;
      return true;
    });
  }
  function countBy(rows,key){
    const counts=new Map();
    rows.forEach(r=>{const label=str(r[key])||'Unspecified';counts.set(label,(counts.get(label)||0)+1);});
    return [...counts].sort((a,b)=>b[1]-a[1]);
  }
  function outputs(rows){
    const counts=new Map();
    rows.forEach(r=>{const pieces=str(r.Request).split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
      (pieces.length?pieces:['Unspecified']).forEach(name=>counts.set(name,(counts.get(name)||0)+1));});
    return [...counts].sort((a,b)=>b[1]-a[1]);
  }
  function bars(id,values){
    const element=$(id);if(!values.length){element.innerHTML='<p class="workspace-empty">No records</p>';return;}
    const max=Math.max(1,...values.map(row=>row[1]));
    element.innerHTML=values.slice(0,14).map(([name,count])=>`<div><div class="workspace-bar-head"><span>${esc(name)}</span><strong>${count}</strong></div><div class="workspace-bar-track"><div class="workspace-bar-fill" style="width:${(100*count/max).toFixed(1)}%"></div></div></div>`).join('');
  }
  function render(){
    const rows=filtered();
    const kpis=[['Requests',rows.length],['Open',rows.filter(open).length],['Completed',rows.filter(completed).length],['Unassigned',rows.filter(unassigned).length],['Overdue',rows.filter(r=>r.isOverdue).length],['Archived total',allRows.filter(archived).length]];
    $('statKpis').innerHTML=kpis.map(([label,value])=>`<div class="workspace-kpi"><strong>${value}</strong><span>${esc(label)}</span></div>`).join('');
    bars('staffBreakdown',countBy(rows.filter(completed),'Assigned'));
    bars('typeBreakdown',countBy(rows,'Request Type'));
    bars('officeBreakdown',countBy(rows,'Office'));
    bars('outputBreakdown',outputs(rows));
    $('statsStatusLine').textContent=`${rows.length} requests in current scope`;
  }
  async function load(){
    $('statsRefresh').disabled=true;
    $('statsStatusLine').textContent='Loading…';
    try{
      const data=await callApi('getRequests');
      if(!data.success)throw new Error(data.message||'Could not load requests.');
      allRows=data.requests||[];render();
    }catch(err){$('statsStatusLine').textContent=err.message;$('statsStatusLine').classList.add('error');}
    finally{$('statsRefresh').disabled=false;}
  }
  async function loadStatus(){
    try{
      const result=await callApi('getFormStatus');
      if(!result.success)throw new Error(result.message||'Unavailable.');
      $('statsFormToggle').checked=!!result.enabled;
      $('statsFormToggle').disabled=false;
      $('statsClosedMessage').value=result.message||'';
      $('statsClosedMessage').disabled=false;
      $('saveStatsFormMessage').disabled=false;
      $('availabilityState').textContent=result.enabled?'OPEN':'CLOSED';
      $('availabilityState').className='form-availability-badge '+(result.enabled?'open':'closed');
    }catch(error){$('formControlFeedback').textContent=error.message;$('availabilityState').textContent='Unavailable';}
  }
  async function saveStatus(){
    $('statsFormToggle').disabled=true;$('saveStatsFormMessage').disabled=true;
    $('formControlFeedback').textContent='Saving…';
    try{
      const result=await callApi('setFormStatus',{enabled:String($('statsFormToggle').checked),message:$('statsClosedMessage').value});
      if(!result.success)throw new Error(result.message||'Could not save.');
      $('formControlFeedback').textContent='Saved.';
      $('availabilityState').textContent=result.enabled?'OPEN':'CLOSED';
      $('availabilityState').className='form-availability-badge '+(result.enabled?'open':'closed');
    }catch(e){$('formControlFeedback').textContent=e.message;await loadStatus();}
    finally{$('statsFormToggle').disabled=false;$('saveStatsFormMessage').disabled=false;}
  }
  ['dateFrom','dateTo','statsStatus','includeArchived'].forEach(id=>$(id).addEventListener('change',render));
  $('statsRefresh').addEventListener('click',load);
  $('statsFormToggle').addEventListener('change',saveStatus);
  $('saveStatsFormMessage').addEventListener('click',saveStatus);
  load();loadStatus();
})();
