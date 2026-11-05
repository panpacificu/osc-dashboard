/* OSC Intern Post Desk v1.5.0 — focused posting-only queue */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const API_URL=(window.OSC_DASHBOARD_CONFIG||{}).API_URL||'';
  const str=x=>String(x==null?'':x).trim();
  const esc=x=>str(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  let pin='';
  let queue=[];
  let index=0;
  let busy=false;
  let currentView='card';
  const drafts=new Map();

  function validFacebookUrl(value) {
    try {
      const u=new URL(str(value));
      return u.protocol==='https:' &&
        ['facebook.com','fb.watch'].some(host=>u.hostname===host||u.hostname.endsWith('.'+host));
    } catch(_) {return false;}
  }
  function api(action,params={}){
    if(!API_URL)return Promise.reject(new Error('Dashboard API_URL is missing from config.js.'));
    return new Promise((resolve,reject)=>{
      const callback=`oscIntern_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
      const tag=document.createElement('script');
      const timeout=setTimeout(()=>{cleanup();reject(new Error('Request timed out.'));},30000);
      function cleanup(){clearTimeout(timeout);delete window[callback];tag.remove();}
      window[callback]=data=>{cleanup();resolve(data);};
      tag.onerror=()=>{cleanup();reject(new Error('Unable to reach OSC. Please try again.'));};
      tag.src=`${API_URL}?${new URLSearchParams({action,callback,pin,...params})}`;
      tag.async=true;document.body.appendChild(tag);
    });
  }
  function feedback(message,type=''){
    $('internFeedback').textContent=message;
    $('internFeedback').className=`intern-feedback ${type}`;
  }
  async function loadQueue() {
    const data=await api('getPostingQueue');
    if(!data.success)throw new Error(data.message||'Unable to load posting queue.');
    // Backend deliberately returns only RID and activity title.
    queue=Array.isArray(data.pending)?data.pending:[];
    index=Math.min(index,Math.max(queue.length-1,0));
    render();
  }
  function renderCard(){
    const card=$('postCard');
    if(!queue.length){
      card.className='swipe-card empty';
      card.innerHTML='<div class="all-clear-icon">✓</div><p class="intern-overline">YOU’RE ALL CAUGHT UP</p><h3>No pending posts</h3><p>Requests with a Facebook URL are removed automatically.</p>';
      $('prevTask').disabled=true;$('skipTask').disabled=true;$('nextTask').disabled=true;
      return;
    }
    index=(index+queue.length)%queue.length;
    const row=queue[index], rid=str(row.requestID),title=str(row.title);
    card.className='swipe-card';
    card.innerHTML=`<div class="swipe-card-top"><span class="card-caption">POSTING TASK</span><span class="card-position">${index+1} / ${queue.length}</span></div>
      <div class="swipe-card-content"><div class="card-rid">${esc(rid)}</div><h3>${esc(title)}</h3></div>
      <label class="card-input-label" for="cardUrl">Published Facebook link</label>
      <input id="cardUrl" class="card-url" type="url" inputmode="url" autocomplete="off" placeholder="https://www.facebook.com/…" value="${esc(drafts.get(rid)||'')}">
      <button type="button" class="card-save" data-action="save">Save link &amp; next <span aria-hidden="true">↗</span></button>`;
    $('prevTask').disabled=false;$('skipTask').disabled=false;$('nextTask').disabled=false;
  }
  function renderTable(){
    const q=str($('internSearch').value).toLowerCase();
    const rows=queue.filter(r=>!q||(`${r.requestID} ${r.title}`).toLowerCase().includes(q));
    $('internTableBody').innerHTML=rows.length?rows.map(row=>{
      const rid=str(row.requestID);
      return `<tr data-rid="${esc(rid)}"><td class="table-rid">${esc(rid)}</td><td>${esc(row.title)}</td><td><label class="sr-only" for="url-${esc(rid)}">Facebook URL for ${esc(rid)}</label><input id="url-${esc(rid)}" type="url" inputmode="url" placeholder="Paste Facebook post URL" value="${esc(drafts.get(rid)||'')}"></td><td><button type="button" data-action="save-table" data-rid="${esc(rid)}">Save ↗</button></td></tr>`;
    }).join(''):'<tr><td colspan="4" class="table-empty">No pending tasks found.</td></tr>';
  }
  function render(){
    $('internPendingCount').textContent=`${queue.length} pending`;
    renderCard();renderTable();
  }
  async function save(rid,url){
    if(busy)return;
    if(!validFacebookUrl(url)) {feedback('Enter a full HTTPS Facebook or fb.watch URL.','error');return;}
    busy=true;
    feedback('Saving link…');
    try {
      const result=await api('saveInternPostLink',{tracking:rid,url});
      if(!result.success)throw new Error(result.message||'Could not save link.');
      queue=queue.filter(row=>str(row.requestID)!==rid);
      drafts.delete(rid);
      index=Math.min(index,Math.max(queue.length-1,0));
      feedback(`Saved ${rid}. This request is no longer in the pending queue.`,'success');
      render();
    } catch(error){feedback(error.message,'error');}
    finally{busy=false;}
  }
  function skip(dir=1){
    if(busy||!queue.length)return;
    index=(index+dir+queue.length)%queue.length;
    renderCard();
  }
  function switchView(mode){
    currentView=mode;
    $('cardView').hidden=mode!=='card';
    $('tableView').hidden=mode!=='table';
    $('cardViewBtn').classList.toggle('active',mode==='card');
    $('tableViewBtn').classList.toggle('active',mode==='table');
    $('cardViewBtn').setAttribute('aria-pressed',String(mode==='card'));
    $('tableViewBtn').setAttribute('aria-pressed',String(mode==='table'));
    if(mode==='table')renderTable();
  }
  async function unlock(event){
    event.preventDefault();
    pin=$('internPin').value;
    $('internUnlock').disabled=true;
    $('internGateStatus').textContent='Checking access…';
    try {
      await loadQueue();
      $('internGate').hidden=true;
      $('internWorkspace').hidden=false;
      $('internPin').value='';
      $('internGateStatus').textContent='';
    }catch(error){pin='';$('internGateStatus').textContent=error.message;}
    finally{$('internUnlock').disabled=false;}
  }
  $('internLogin').addEventListener('submit',unlock);
  $('internRefresh').addEventListener('click',async()=>{
    $('internRefresh').disabled=true;feedback('Refreshing…');
    try{await loadQueue();feedback('Pending queue is up to date.','success');}
    catch(error){feedback(error.message,'error');}
    finally{$('internRefresh').disabled=false;}
  });
  $('cardViewBtn').addEventListener('click',()=>switchView('card'));
  $('tableViewBtn').addEventListener('click',()=>switchView('table'));
  $('internSearch').addEventListener('input',renderTable);
  $('prevTask').addEventListener('click',()=>skip(-1));
  $('skipTask').addEventListener('click',()=>skip(1));
  $('nextTask').addEventListener('click',()=>skip(1));
  $('postCard').addEventListener('input',event=>{
    if(event.target.id==='cardUrl'&&queue.length)drafts.set(queue[index].requestID,event.target.value);
  });
  $('postCard').addEventListener('click',event=>{
    if(event.target.closest('[data-action="save"]')&&queue.length){
      const row=queue[index];save(row.requestID,$('cardUrl').value);
    }
  });
  $('internTableBody').addEventListener('input',event=>{
    const row=event.target.closest('tr[data-rid]');
    if(row&&event.target.tagName==='INPUT')drafts.set(row.dataset.rid,event.target.value);
  });
  $('internTableBody').addEventListener('click',event=>{
    const button=event.target.closest('[data-action="save-table"]');if(!button)return;
    const row=button.closest('tr');
    const input=row&&row.querySelector('input');
    if(input)save(button.dataset.rid,input.value);
  });
  // Swipe gestures are only recognized on the card surface, not on inputs/buttons.
  let start=null;
  const card=$('postCard');
  card.addEventListener('pointerdown',event=>{
    if(!queue.length || event.target.closest('button,input,a,label'))return;
    start={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  card.addEventListener('pointerup',event=>{
    if(!start || start.id!==event.pointerId)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
    if(Math.abs(dx)<75||Math.abs(dx)<Math.abs(dy)*1.4)return;
    if(dx<0){skip(1);}else{
      const input=$('cardUrl');
      if(input&&queue[index])save(queue[index].requestID,input.value);
    }
  });
  card.addEventListener('pointercancel',()=>{start=null;});
  card.addEventListener('keydown',event=>{
    if(event.target.matches('input,button'))return;
    if(event.key==='ArrowLeft'){event.preventDefault();skip(1);}
    if(event.key==='ArrowRight'){event.preventDefault();const input=$('cardUrl');if(input&&queue[index])save(queue[index].requestID,input.value);}
  });
})();
