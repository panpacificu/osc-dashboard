/* OSC Published Post SDG Tagging Desk v1.6.3.
 * Public Facebook embeds are best-effort; title/SDG/core-value changes are saved to the existing monitoring Sheet.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),trim=v=>String(v??'').trim();
const escapeHtml=v=>trim(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const API=window.OSC_DASHBOARD_CONFIG?.API_URL||'';
const CORE=['Pioneer','Compassion','Service','Truth'];
const CORE_ICONS={Pioneer:'✦',Compassion:'♥',Service:'✳',Truth:'✓'};
const SDGS=[
 [1,'No Poverty','#E5243B'],[2,'Zero Hunger','#DDA63A'],[3,'Good Health','#4C9F38'],[4,'Quality Education','#C5192D'],
 [5,'Gender Equality','#FF3A21'],[6,'Clean Water','#26BDE2'],[7,'Clean Energy','#FCC30B'],[8,'Decent Work','#A21942'],
 [9,'Industry & Innovation','#FD6925'],[10,'Reduced Inequalities','#DD1367'],[11,'Sustainable Cities','#FD9D24'],
 [12,'Responsible Consumption','#BF8B2E'],[13,'Climate Action','#3F7E44'],[14,'Life Below Water','#0A97D9'],
 [15,'Life on Land','#56C02B'],[16,'Peace & Justice','#00689D'],[17,'Partnerships','#19486A']
];
// Lightweight original outline pictograms, not the official UN SDG marks.
const ICONS={
 1:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-2a4.5 4.5 0 0 1 9 0v2M14 20v-2a3.5 3.5 0 0 1 7 0v2"/>',
 2:'<path d="M3 13h18a9 9 0 0 1-18 0ZM9 3c-2 3 2 3 0 6m6-6c-2 3 2 3 0 6M7 21h10"/>',
 3:'<path d="M20.7 5.7a5 5 0 0 0-7.1 0L12 7.3l-1.6-1.6a5 5 0 0 0-7.1 7.1L12 21l8.7-8.2a5 5 0 0 0 0-7.1Z"/><path d="M4 13h4l2-4 3 8 2-4h5"/>',
 4:'<path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1ZM12 6v14"/>',
 5:'<circle cx="10" cy="9" r="5"/><path d="M10 14v7m-4-3h8M14 5l5-4m-5 0h5v5"/>',
 6:'<path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/><path d="M8 17c1 2 2 3 4 3"/>',
 7:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.2 2.2m11.2 11.2 2.2 2.2M19.8 4.2l-2.2 2.2M6.4 17.6l-2.2 2.2"/>',
 8:'<path d="M3 20h18M5 17v-5m5 5V9m5 8V5m5 12V3"/><path d="m4 9 5-4 4 2 7-5"/>',
 9:'<path d="M3 21V9l6-3v15m0-13 6-4v17m0-11 6-3v14M1 21h22"/><path d="M6 12v2m6-6v2m6 3v2"/>',
 10:'<path d="M3 7h18M3 17h18M6 12h12M6 4l-3 3 3 3m12 4 3 3-3 3"/>',
 11:'<path d="M3 21V10h7v11m4 0V4h7v17M1 21h22M6 13v2m0 3v1M17 7v2m0 3v2m0 3v2"/>',
 12:'<path d="m9 3 3-2 4 4-3 2M12 1l3 7M7 8l-4 7 3 4M2 14h7M15 10l6 1 1 5M21 11l-5 9h-7"/>',
 13:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18m0-18c5 5 5 13 0 18"/>',
 14:'<path d="M3 12s6-7 12-7c2 0 4 3 5 7-1 4-3 7-5 7-6 0-12-7-12-7Zm0 0-2-4v8l2-4Z"/><circle cx="15" cy="11" r="1"/>',
 15:'<path d="M12 2 4 13h5l-4 5h14l-4-5h5L12 2ZM12 18v4"/>',
 16:'<path d="M12 3v18M4 7h16M7 7l-4 7h8L7 7Zm10 0-4 7h8l-4-7ZM8 21h8"/>',
 17:'<circle cx="12" cy="5" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M10 8 7 15m7-7 3 7M8 18h8"/>'
};
function goalIcon(n){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]||''}</svg>`;}
let pin='',queue=[],index=0,busy=false,toastTimer=null;
const drafts=new Map();
function keyFor(row){return String(row.rowNumber)+'|'+row.url;}
function choicesFor(row){
 const key=keyFor(row);
 if(!drafts.has(key)){
   const core=(Array.isArray(row.coreValues)?row.coreValues:[]).filter(x=>CORE.includes(x));
   drafts.set(key,{title:trim(row.title),sdgs:[],core:[...new Set(core)]});
 }
 return drafts.get(key);
}
function api(action,params={}){
 if(!API)return Promise.reject(new Error('Dashboard API_URL is missing from config.js.'));
 return new Promise((resolve,reject)=>{
   const callback='oscSdg_'+Date.now()+'_'+Math.random().toString(36).slice(2);
   const tag=document.createElement('script');
   const timer=setTimeout(()=>{cleanup();reject(new Error('The monitoring service timed out.'));},30000);
   function cleanup(){clearTimeout(timer);delete window[callback];tag.remove();}
   window[callback]=data=>{cleanup();resolve(data);};
   tag.onerror=()=>{cleanup();reject(new Error('Could not contact the monitoring service.'));};
   tag.src=API+'?'+new URLSearchParams({action,callback,pin,...params}).toString();
   tag.async=true;document.body.appendChild(tag);
 });
}
function message(text,type=''){$('status').textContent=text;$('status').className='message '+type;}
function toast(text,type='ok'){
 const el=$('saveToast');if(!el)return;
 clearTimeout(toastTimer);el.textContent=text;el.className='save-toast '+type;el.hidden=false;
 toastTimer=setTimeout(()=>{el.hidden=true;},4500);
}
async function loadQueue(){
 const result=await api('getMonitoringTagQueue');
 if(!result.success)throw new Error(result.message||'Unable to load posts.');
 queue=Array.isArray(result.pending)?result.pending:[];
 index=0;render();
}
function safePostUrl(input){
 try{const u=new URL(input);if(u.protocol!=='https:' || !(/(^|\.)facebook\.com$/.test(u.hostname)||u.hostname==='fb.watch'))return '';return u.href;}
 catch(_){return '';}
}
function embedUrl(input){
 const url=safePostUrl(input);if(!url)return '';
 const isVideo=/\/(videos|reel|watch|share\/v)\//i.test(new URL(url).pathname)||new URL(url).hostname==='fb.watch';
 return 'https://www.facebook.com/plugins/'+(isVideo?'video':'post')+'.php?'+new URLSearchParams({href:url,show_text:'true',width:'500'}).toString();
}
function goalMarkup(choice){
 return SDGS.map(([n,name,color])=>`<button class="sdg-tile" type="button" data-goal="${n}" style="--goal:${color}" aria-pressed="${choice.sdgs.includes(n)}" aria-label="SDG ${n}, ${escapeHtml(name)}">
  <span class="tile-num">${n}</span><span class="tile-icon">${goalIcon(n)}</span><span class="tile-label">${escapeHtml(name)}</span><span class="tile-check" aria-hidden="true">✓</span></button>`).join('');
}
function coreMarkup(choice){
 return CORE.map(v=>`<button class="core-tile" data-core="${v}" type="button" aria-pressed="${choice.core.includes(v)}"><span class="core-symbol" aria-hidden="true">${CORE_ICONS[v]}</span><span>${v}</span><span class="core-check" aria-hidden="true">✓</span></button>`).join('');
}
function cardMarkup(row){
 if(!row)return `<div class="all-done"><span class="done-icon">✓</span><h2>All posts are tagged!</h2><p class="muted">New Meta CSV imports will appear in this workspace automatically.</p></div>`;
 const choice=choicesFor(row),url=safePostUrl(row.url),embed=embedUrl(row.url);
 const preview=embed?`<iframe class="fb-post-frame" title="Facebook preview for ${escapeHtml(row.title)}" src="${escapeHtml(embed)}" width="500" height="600" loading="lazy" allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`:
 '<div class="preview-unavailable">This post link cannot be previewed.</div>';
 return `<div class="tag-workspace">
 <section class="facebook-pane" aria-label="Facebook post preview">
  <div class="pane-top"><span class="kicker">FACEBOOK POST PREVIEW</span><span class="post-count">${index+1} of ${queue.length}${row.deferred?' · Deferred':''}</span></div>
  <div class="facebook-frame">${preview}</div>
  <div class="preview-foot"><span>Public posts can be previewed here. Facebook may restrict some embeds.</span>${url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open original ↗</a>`:''}</div>
 </section>
 <section class="tagging-pane" aria-label="Edit and tag Facebook post">
  <div class="pane-top"><span class="kicker">TAG THE POST</span><span class="post-date">${escapeHtml(row.date)}</span></div>
  <label class="edit-label" for="postTitleInput">Post title <span class="small-help">Editable</span></label>
  <input id="postTitleInput" class="post-title-input" type="text" maxlength="300" value="${escapeHtml(choice.title)}" placeholder="Add a useful post title" aria-describedby="titleHelp"/>
  <span id="titleHelp" class="field-help">This title will be saved in the Monitoring Sheet.</span>
  <div class="section-head"><h3>Choose SDGs</h3><span id="goalCounter" class="selection-count">${choice.sdgs.length}/5 selected</span></div>
  <div class="sdg-grid" role="group" aria-label="Select 1 to 5 SDGs">${goalMarkup(choice)}</div>
  <div class="section-head core-section-head"><h3>Core Values</h3><span id="coreCounter" class="selection-count">${choice.core.length}/4 selected</span></div>
  <div class="core-grid" role="group" aria-label="Select at least one Panpacific University core value">${coreMarkup(choice)}</div>
  <div class="save-section"><p id="selectionHint" class="field-help">Choose at least one SDG and one Core Value.</p>
  <button class="primary save-post-btn" data-action="save" type="button">Save changes &amp; next <span aria-hidden="true">→</span></button></div>
 </section></div>`;
}
function syncControls(){
 const row=queue[index];if(!row)return;
 const choice=choicesFor(row),el=$('postCard');
 el.querySelectorAll('[data-goal]').forEach(b=>b.setAttribute('aria-pressed',String(choice.sdgs.includes(Number(b.dataset.goal)))));
 el.querySelectorAll('[data-core]').forEach(b=>b.setAttribute('aria-pressed',String(choice.core.includes(b.dataset.core))));
 const valid=choice.sdgs.length>0&&choice.core.length>0&&trim(choice.title).length>0;
 const count=el.querySelector('#goalCounter'),cCount=el.querySelector('#coreCounter'),hint=el.querySelector('#selectionHint'),save=el.querySelector('[data-action="save"]');
 if(count)count.textContent=choice.sdgs.length+'/5 selected';
 if(cCount)cCount.textContent=choice.core.length+'/4 selected';
 if(hint)hint.textContent=!choice.sdgs.length?'Choose at least one SDG.':!choice.core.length?'Choose at least one Core Value.':!trim(choice.title)?'Enter a post title.':'Ready to save your selections.';
 if(save){save.disabled=!valid||busy;save.textContent=busy?'Saving to Sheet…':'Save changes & next →';}
}
function renderCard(){
 $('postCard').innerHTML=cardMarkup(queue[index]);
 syncControls();
 $('previousBtn').disabled=!queue.length||busy;
 $('skipBtn').disabled=!queue.length||busy;
}
function renderTable(){
 const q=trim($('search').value).toLowerCase();
 const rows=queue.filter(r=>!q||(r.title+' '+r.date).toLowerCase().includes(q));
 $('tableBody').innerHTML=rows.map(r=>`<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(choicesFor(r).title)}${r.deferred?' <span class="deferred-pill">Moved to end</span>':''}</td><td class="url-cell"><a href="${escapeHtml(safePostUrl(r.url))}" target="_blank" rel="noopener noreferrer">Open post ↗</a></td><td><button type="button" class="table-action" data-row="${r.rowNumber}">Tag →</button> <button type="button" class="table-action subtle" data-defer="${r.rowNumber}">Move to end ↪</button></td></tr>`).join('')||'<tr><td class="empty" colspan="4">No pending posts found.</td></tr>';
}
function render(){
 $('pendingCount').textContent=queue.length+' pending';renderCard();renderTable();
}
function previous(){if(!queue.length||busy)return;index=(index-1+queue.length)%queue.length;renderCard();message('');}
async function moveToEnd(rowOverride){
 if(busy||!queue.length)return;
 const row=rowOverride||queue[index];
 busy=true;message('Moving this post to the end of your queue…');syncControls();
 try{
  const result=await api('deferMonitoringPost',{rowNumber:String(row.rowNumber),url:row.url});
  if(!result.success)throw new Error(result.message||'Could not move this post.');
  // Reload server ordering so it persists after refreshing the browser.
  await loadQueue();
  message('Post moved to the end of the queue.','ok');toast('↪ Moved to end — it will stay there after refresh.');
 }catch(error){message(error.message,'error');toast('Move failed: '+error.message,'error');}
 finally{busy=false;syncControls();}
}
async function saveCurrent(){
 if(busy||!queue.length)return;
 const row=queue[index],choice=choicesFor(row),title=trim(choice.title);
 if(!title){message('Add a post title before saving.','error');return;}
 if(!choice.sdgs.length){message('Select at least one SDG.','error');return;}
 if(!choice.core.length){message('Select at least one Core Value.','error');return;}
 busy=true;message('Saving changes to the Monitoring Sheet…');syncControls();
 try{
  const result=await api('saveMonitoringTags',{rowNumber:String(row.rowNumber),url:row.url,title,sdgs:choice.sdgs.join(','),coreValues:choice.core.join(',')});
  if(!result.success)throw new Error(result.message||'Save failed.');
  drafts.delete(keyFor(row));
  // Refresh from Google Sheets immediately so saved/deferred state is accurate.
  try { await loadQueue(); }
  catch(refreshError){
    queue=queue.filter(x=>x.rowNumber!==row.rowNumber);index=0;render();
    message('Saved, but could not refresh the queue: '+refreshError.message,'error');
    toast('✓ Saved. Refresh the list when your connection returns.');return;
  }
  message('Saved and queue refreshed from Google Sheets.','ok');
  toast(`✓ Saved! Title, ${choice.sdgs.length} SDG${choice.sdgs.length===1?'':'s'} and ${choice.core.length} Core Value${choice.core.length===1?'':'s'} recorded.`);
 }catch(error){message(error.message,'error');toast('Could not save: '+error.message,'error');}
 finally{busy=false;syncControls();}
}
function toggleMode(mode){
 $('cardArea').hidden=mode!=='card';$('tableArea').hidden=mode!=='table';
 $('cardMode').classList.toggle('active',mode==='card');$('tableMode').classList.toggle('active',mode==='table');
 $('cardMode').setAttribute('aria-pressed',String(mode==='card'));$('tableMode').setAttribute('aria-pressed',String(mode==='table'));
 if(mode==='table')renderTable();
}
$('login').addEventListener('submit',async e=>{
 e.preventDefault();pin=$('pin').value;$('loginBtn').disabled=true;$('gateStatus').textContent='Checking access…';
 try{await loadQueue();$('gate').hidden=true;$('desk').hidden=false;$('pin').value='';$('gateStatus').textContent='';}
 catch(error){pin='';$('gateStatus').textContent=error.message;}
 finally{$('loginBtn').disabled=false;}
});
$('refreshBtn').addEventListener('click',async()=>{
 $('refreshBtn').disabled=true;
 try{await loadQueue();message('Updated the pending posts queue.','ok');}
 catch(error){message(error.message,'error');}
 finally{$('refreshBtn').disabled=false;}
});
$('cardMode').addEventListener('click',()=>toggleMode('card'));
$('tableMode').addEventListener('click',()=>toggleMode('table'));
$('search').addEventListener('input',renderTable);
$('previousBtn').addEventListener('click',previous);
$('skipBtn').addEventListener('click',()=>moveToEnd());
$('postCard').addEventListener('input',e=>{
 if(e.target.id!=='postTitleInput'||!queue[index])return;
 choicesFor(queue[index]).title=e.target.value;syncControls();
});
$('postCard').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||!queue.length||busy)return;
 const choice=choicesFor(queue[index]);
 if(button.dataset.goal){
  const n=Number(button.dataset.goal),i=choice.sdgs.indexOf(n);
  if(i>=0)choice.sdgs.splice(i,1);
  else if(choice.sdgs.length<5)choice.sdgs.push(n);
  else{message('You can assign up to five SDGs per post in the existing Sheet.','error');return;}
  choice.sdgs.sort((a,b)=>a-b);syncControls();
 }else if(button.dataset.core){
  const v=button.dataset.core,i=choice.core.indexOf(v);
  if(i>=0)choice.core.splice(i,1);else choice.core.push(v);
  syncControls();
 }else if(button.dataset.action==='save')saveCurrent();
});
$('tableBody').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||busy)return;
 if(button.dataset.defer){
   const row=queue.find(r=>r.rowNumber===Number(button.dataset.defer));
   if(row)moveToEnd(row);
   return;
 }
 if(!button.dataset.row)return;
 const found=queue.findIndex(r=>r.rowNumber===Number(button.dataset.row));
 if(found>=0){index=found;toggleMode('card');renderCard();window.scrollTo({top:0,behavior:'smooth'});}
});
let gesture=null;
$('postCard').addEventListener('pointerdown',e=>{
 if(e.target.closest('button,a,input,label,iframe,.facebook-frame,.sdg-grid,.core-grid'))return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
});
$('postCard').addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
 if(Math.abs(dx)<105||Math.abs(dx)<Math.abs(dy)*1.3)return;
 if(dx<0)moveToEnd();else saveCurrent();
});
$('postCard').addEventListener('pointercancel',()=>gesture=null);
})();
