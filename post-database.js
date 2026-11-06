/* Facebook Post Database v1.6.4 — read-only index of Post Monitoring Log. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const API=window.OSC_DASHBOARD_CONFIG?.API_URL||'';
const SDGS=[
 [1,'No Poverty','#E5243B'],[2,'Zero Hunger','#DDA63A'],[3,'Good Health and Well-being','#4C9F38'],[4,'Quality Education','#C5192D'],[5,'Gender Equality','#FF3A21'],[6,'Clean Water and Sanitation','#26BDE2'],[7,'Affordable and Clean Energy','#FCC30B'],[8,'Decent Work and Economic Growth','#A21942'],[9,'Industry, Innovation and Infrastructure','#FD6925'],[10,'Reduced Inequalities','#DD1367'],[11,'Sustainable Cities and Communities','#FD9D24'],[12,'Responsible Consumption and Production','#BF8B2E'],[13,'Climate Action','#3F7E44'],[14,'Life Below Water','#0A97D9'],[15,'Life on Land','#56C02B'],[16,'Peace, Justice and Strong Institutions','#00689D'],[17,'Partnerships for the Goals','#19486A']
];
let pin='',posts=[],matching=[],selected='',limit=55,loading=false,queryTimer=null;
function setStatus(value='',bad=false){$('databaseStatus').textContent=value;$('databaseStatus').className='feedback'+(bad?' error':'');}
function safeUrl(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||!(u.hostname==='facebook.com'||u.hostname.endsWith('.facebook.com')||u.hostname==='fb.watch'))return '';return u.href;}catch(e){return '';}}
function fbEmbed(raw){const u=safeUrl(raw);if(!u)return '';
 const url=new URL(u);const video=/\/(videos|reel|watch|share\/v)\//i.test(url.pathname)||url.hostname==='fb.watch';
 return 'https://www.facebook.com/plugins/'+(video?'video':'post')+'.php?'+new URLSearchParams({href:u,show_text:'true',width:'500'}).toString();
}
function api(params){
 if(!API)return Promise.reject(new Error('Dashboard API_URL is missing from config.js.'));
 return new Promise((resolve,reject)=>{
  const cb='oscDB_'+Date.now()+'_'+Math.random().toString(36).slice(2),script=document.createElement('script');
  const timeout=setTimeout(()=>{clean();reject(new Error('The monitoring server timed out.'));},30000);
  function clean(){clearTimeout(timeout);delete window[cb];script.remove();}
  window[cb]=data=>{clean();resolve(data);};script.onerror=()=>{clean();reject(new Error('Could not reach the monitoring server.'));};
  script.src=API+'?'+new URLSearchParams({action:'getMonitoringPostDatabase',callback:cb,pin,...params}).toString();
  script.async=true;document.body.appendChild(script);
 });
}
function goalsFor(p){return (p.sdgs||[]).map(v=>(/^\s*SDG\s*(\d+)\b/i.exec(v)||[])[1]).filter(Boolean).map(Number);}
function idFor(p){return p.url;}
function filters(){
 const term=$('postSearch').value.toLowerCase().trim(),month=$('monthFilter').value,sdg=Number($('sdgFilter').value),core=$('coreFilter').value;
 matching=posts.filter(p=>{
  if(term && ![p.title,p.date,p.url,(p.sdgs||[]).join(' '),(p.coreValues||[]).join(' ')].join(' ').toLowerCase().includes(term))return false;
  if(month && !p.date.startsWith(month))return false;
  if(sdg && !goalsFor(p).includes(sdg))return false;
  if(core && !(p.coreValues||[]).includes(core))return false;
  return true;
 });
 matching.sort((a,b)=>String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title));
 if(!matching.some(p=>idFor(p)===selected))selected=matching[0]?idFor(matching[0]):'';
 $('matchStat').textContent=matching.length+' matches';renderResults();renderDetails();
}
function renderResults(){
 const visible=matching.slice(0,limit);
 $('resultList').innerHTML=visible.length?visible.map(p=>{
  const active=idFor(p)===selected,nums=goalsFor(p),date=esc(p.date||'Date unavailable');
  return `<button type="button" class="post-result" role="listitem" data-url="${esc(p.url)}" aria-pressed="${active}"><span class="result-avatar" aria-hidden="true">f</span><span class="result-main"><strong title="${esc(p.title)}">${esc(p.title||'Untitled Facebook post')}</strong><span class="result-meta"><span>${date}</span><span class="result-tag ${nums.length?'':'pending'}">${nums.length?nums.length+' SDG'+(nums.length===1?'':'s'):'Needs SDGs'}</span>${p.coreValues?.length?`<span>${p.coreValues.length} Core Value${p.coreValues.length===1?'':'s'}</span>`:''}</span></span><span class="result-arrow" aria-hidden="true">›</span></button>`;
 }).join(''):'<div class="empty-list">No matching Facebook posts.<br>Try another keyword or clear your filters.</div>';
 $('loadMoreBtn').hidden=matching.length<=limit;
 $('loadMoreBtn').textContent='Show more posts ↓ ('+Math.min(limit,matching.length)+' of '+matching.length+')';
}
function renderDetails(){
 const p=matching.find(x=>idFor(x)===selected);if(!p){$('postDetails').innerHTML='<div class="details-empty">Choose a post to see its preview.</div>';return;}
 const url=safeUrl(p.url),embed=fbEmbed(p.url),nums=goalsFor(p);
 const preview=embed?`<iframe src="${esc(embed)}" title="Preview of ${esc(p.title||'published Facebook post')}" loading="lazy" width="500" height="525" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture"></iframe>`:'<div class="detail-preview-fallback">Preview unavailable for this post link.</div>';
 const sdg=nums.map(n=>{const g=SDGS.find(x=>x[0]===n);return g?`<span class="sdg-tag" style="--sdg:${g[2]}"><span class="sdg-bullet">${n}</span>${esc(g[1])}</span>`:'';}).join('');
 const cores=(p.coreValues||[]).map(v=>`<span class="core-tag">${esc(v)}</span>`).join('');
 $('postDetails').innerHTML=`<div class="detail-topline"><span class="detail-id">PUBLISHED FACEBOOK POST</span><span class="detail-date">${esc(p.date||'Date unavailable')}</span></div><h2 class="detail-title">${esc(p.title||'Untitled Facebook post')}</h2><div class="detail-preview">${preview}</div><p class="preview-footnote">Embedded previews work for eligible public Facebook posts. If Facebook restricts it, open the original post instead.</p><div class="detail-section"><span class="detail-label">SUSTAINABLE DEVELOPMENT GOALS (${nums.length})</span><div class="sdg-tags">${sdg||'<span class="untagged">Not yet tagged</span>'}</div></div><div class="detail-section"><span class="detail-label">PANPACIFIC UNIVERSITY CORE VALUES</span><div class="core-tags">${cores||'<span class="untagged">Not yet assigned</span>'}</div></div><div class="detail-actions">${url?`<a class="primary-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open original Facebook post ↗</a>`:''}<a class="secondary-link" href="post-sdg-desk.html" target="_blank" rel="noopener noreferrer">Open Tagging Desk ↗</a></div>`;
}
function setupOptions(){
 const months=[...new Set(posts.map(p=>String(p.date||'').slice(0,7)).filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort().reverse();
 $('monthFilter').innerHTML='<option value="">All months</option>'+months.map(m=>{const [year,mon]=m.split('-');const label=new Date(Number(year),Number(mon)-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});return `<option value="${esc(m)}">${esc(label)}</option>`;}).join('');
 $('sdgFilter').innerHTML='<option value="">All 17 SDGs</option>'+SDGS.map(g=>`<option value="${g[0]}">SDG ${g[0]} · ${esc(g[1])}</option>`).join('');
 $('totalStat').textContent=posts.length+' published';$('taggedStat').textContent=posts.filter(p=>p.tagged).length+' tagged';
}
async function load(){
 if(loading)return;loading=true;$('reloadBtn').disabled=true;setStatus('Loading published posts…');
 try{const response=await api({});if(!response.success)throw new Error(response.message||'Unable to load posts.');
  posts=Array.isArray(response.posts)?response.posts.filter(p=>safeUrl(p.url)):[];
  setupOptions();limit=55;filters();setStatus('Database updated from the monitoring Sheet.');
 }catch(e){setStatus(e.message,true);throw e;}
 finally{loading=false;$('reloadBtn').disabled=false;}
}
$('accessForm').addEventListener('submit',async e=>{
 e.preventDefault();pin=$('accessPin').value;$('unlockBtn').disabled=true;$('accessStatus').textContent='Checking access…';
 try{await load();$('accessPanel').hidden=true;$('databaseApp').hidden=false;$('accessPin').value='';$('accessStatus').textContent='';
  const preset=new URLSearchParams(location.search).get('search');if(preset){$('postSearch').value=preset;filters();}
 }catch(err){pin='';$('accessStatus').textContent=err.message;}
 finally{$('unlockBtn').disabled=false;}
});
$('reloadBtn').addEventListener('click',()=>{load().catch(()=>{});});
$('postSearch').addEventListener('input',()=>{clearTimeout(queryTimer);queryTimer=setTimeout(()=>{limit=55;filters();},110);});
['monthFilter','sdgFilter','coreFilter'].forEach(id=>$(id).addEventListener('change',()=>{limit=55;filters();}));
$('resetBtn').addEventListener('click',()=>{$('postSearch').value='';$('monthFilter').value='';$('sdgFilter').value='';$('coreFilter').value='';limit=55;filters();});
$('resultList').addEventListener('click',e=>{
 const b=e.target.closest('button[data-url]');if(!b)return;
 selected=b.dataset.url;renderResults();renderDetails();
 if(innerWidth<1121)$('postDetails').scrollIntoView({behavior:'smooth',block:'start'});
});
$('loadMoreBtn').addEventListener('click',()=>{limit+=55;renderResults();});
})();
