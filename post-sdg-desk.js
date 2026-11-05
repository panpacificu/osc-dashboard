/* OSC SDG intern desk v1.6.0 — writes ONLY selected SDGs and optional core values. */
(()=>{'use strict';
const $=id=>document.getElementById(id),trim=v=>String(v??'').trim();
const escapeHtml=v=>trim(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const API=window.OSC_DASHBOARD_CONFIG?.API_URL||'';
let pin='',queue=[],index=0,busy=false,currentMode='card';
const drafts=new Map();
const CORE=['Pioneer','Compassion','Service','Truth'];
function api(action,params={}){
 if(!API)return Promise.reject(new Error('Dashboard API_URL is missing from config.js.'));
 return new Promise((resolve,reject)=>{
   const callback='oscSdg_'+Date.now()+'_'+Math.random().toString(36).slice(2);
   const tag=document.createElement('script');const timer=setTimeout(()=>{cleanup();reject(new Error('Request timed out.'));},30000);
   function cleanup(){clearTimeout(timer);delete window[callback];tag.remove();}
   window[callback]=data=>{cleanup();resolve(data);};
   tag.onerror=()=>{cleanup();reject(new Error('Could not reach the SDG monitoring service.'));};
   tag.src=API+'?'+new URLSearchParams({action,callback,pin,...params});
   tag.async=true;document.body.appendChild(tag);
 });
}
function message(text,type=''){$('status').textContent=text;$('status').className='message '+type;}
async function loadQueue(){
 const result=await api('getMonitoringTagQueue');
 if(!result.success)throw new Error(result.message||'Unable to load posts.');
 queue=Array.isArray(result.pending)?result.pending:[];
 index=Math.min(index,Math.max(0,queue.length-1));render();
}
function choicesFor(row){
 const key=row?.url||'';
 if(!drafts.has(key))drafts.set(key,{sdgs:[],core:[],coreOpen:false});
 return drafts.get(key);
}
function cardMarkup(row){
 if(!row)return '<p class="kicker">ALL DONE</p><h2>Every published post is tagged.</h2><p class="muted">New CSV imports will appear here once they are uploaded.</p>';
 const choices=choicesFor(row);
 const goalHtml=Array.from({length:17},(_,i)=>i+1).map(n=>`<button type="button" class="chip" data-goal="${n}" aria-pressed="${choices.sdgs.includes(n)}">SDG ${n}</button>`).join('');
 const coreHtml=CORE.map(v=>`<button type="button" class="chip" data-core="${v}" aria-pressed="${choices.core.includes(v)}">${v}</button>`).join('');
 return `<div class="desk-header"><span class="kicker">PUBLISHED FACEBOOK POST</span><span class="pill">${index+1} / ${queue.length}</span></div><p class="muted">${escapeHtml(row.date)}</p><h2>${escapeHtml(row.title)}</h2>
   <a class="url" target="_blank" rel="noopener noreferrer" href="${escapeHtml(row.url)}">View Facebook post ↗</a>
   <label>Choose all applicable SDGs <span class="muted">(1–5)</span></label><div class="chips">${goalHtml}</div>
   <button class="core-toggle" type="button" data-action="core">${choices.coreOpen?'Hide':'Optional'}: Core Values ↕</button>
   <div ${choices.coreOpen?'':'hidden'} class="chips">${coreHtml}</div>
   <div class="actions"><button class="primary" data-action="save" type="button" ${choices.sdgs.length?'':'disabled'}>Save SDGs & next →</button><button class="secondary" data-action="skip" type="button">Skip</button></div>`;
}
function renderCard(){
 const el=$('postCard');el.innerHTML=cardMarkup(queue[index]);
}
function renderTable(){
 const q=trim($('search').value).toLowerCase();
 const rows=queue.filter(r=>!q||(r.title+' '+r.date).toLowerCase().includes(q));
 $('tableBody').innerHTML=rows.map(r=>`<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.title)}</td><td class="url-cell"><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">Open post ↗</a></td><td><button type="button" class="table-action" data-row="${r.rowNumber}">Tag →</button></td></tr>`).join('')||'<tr><td class="empty" colspan="4">No pending posts found.</td></tr>';
}
function render(){
 $('pendingCount').textContent=queue.length+' pending';renderCard();renderTable();
}
function skip(step=1){if(!queue.length||busy)return;index=(index+step+queue.length)%queue.length;renderCard();}
async function saveCurrent(){
 if(busy||!queue.length)return;
 const row=queue[index],choice=choicesFor(row);
 if(!choice.sdgs.length){message('Select at least one SDG.','error');return;}
 busy=true;message('Saving SDGs…');
 try{
  const result=await api('saveMonitoringTags',{rowNumber:String(row.rowNumber),url:row.url,sdgs:choice.sdgs.join(','),coreValues:choice.core.join(',')});
  if(!result.success)throw new Error(result.message||'Save failed.');
  drafts.delete(row.url);queue=queue.filter(x=>x.url!==row.url);
  index=Math.min(index,Math.max(0,queue.length-1));render();message('SDGs recorded. On to the next post.','ok');
 }catch(error){message(error.message,'error');}
 finally{busy=false;}
}
function toggleMode(mode){
 currentMode=mode;$('cardArea').hidden=mode!=='card';$('tableArea').hidden=mode!=='table';
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
 try{await loadQueue();message('The monitoring queue is up to date.','ok');}
 catch(error){message(error.message,'error');}
 finally{$('refreshBtn').disabled=false;}
});
$('cardMode').addEventListener('click',()=>toggleMode('card'));
$('tableMode').addEventListener('click',()=>toggleMode('table'));
$('search').addEventListener('input',renderTable);
$('previousBtn').addEventListener('click',()=>skip(-1));
$('skipBtn').addEventListener('click',()=>skip(1));
$('postCard').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||!queue.length||busy)return;
 const current=queue[index],choice=choicesFor(current);
 if(button.dataset.goal){
  const n=Number(button.dataset.goal);const i=choice.sdgs.indexOf(n);
  if(i>=0)choice.sdgs.splice(i,1);else if(choice.sdgs.length<5)choice.sdgs.push(n);
  else{message('The existing monitoring Sheet supports up to five SDGs per post.','error');return;}
  choice.sdgs.sort((a,b)=>a-b);renderCard();
 }else if(button.dataset.core){
  const v=button.dataset.core,i=choice.core.indexOf(v);
  if(i>=0)choice.core.splice(i,1);else choice.core.push(v);
  renderCard();
 }else if(button.dataset.action==='core'){choice.coreOpen=!choice.coreOpen;renderCard();}
 else if(button.dataset.action==='save')saveCurrent();
 else if(button.dataset.action==='skip')skip();
});
$('tableBody').addEventListener('click',event=>{
 const button=event.target.closest('button[data-row]');if(!button)return;
 const found=queue.findIndex(r=>r.rowNumber===Number(button.dataset.row));
 if(found>=0){index=found;toggleMode('card');renderCard();window.scrollTo({top:100,behavior:'smooth'});}
});
let gesture=null;
$('postCard').addEventListener('pointerdown',e=>{
 if(e.target.closest('button,a,input,label'))return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
});
$('postCard').addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
 if(Math.abs(dx)<85||Math.abs(dx)<Math.abs(dy)*1.3)return;
 if(dx<0)skip();else saveCurrent();
});
$('postCard').addEventListener('pointercancel',()=>gesture=null);
})();
