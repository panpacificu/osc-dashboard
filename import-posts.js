/* OSC monthly CSV import v1.6.1 — browser parsing, mapping and batched JSONP import. */
(()=>{'use strict';
const $=id=>document.getElementById(id),trim=v=>String(v??'').trim();
const escapeHtml=v=>trim(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const API=window.OSC_DASHBOARD_CONFIG?.API_URL||'';
let csvRows=[],headers=[],candidateRows=[],activeImport=false;
function info(s,type=''){const el=$('importStatus');el.textContent=s;el.className='message '+type;}
function api(action,params={}){
  if(!API)return Promise.reject(new Error('Dashboard API_URL is missing from config.js.'));
  return new Promise((resolve,reject)=>{
    const callback='oscImport_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const tag=document.createElement('script');
    const timer=setTimeout(()=>{cleanup();reject(new Error('Import service timed out.'));},30000);
    function cleanup(){clearTimeout(timer);delete window[callback];tag.remove();}
    window[callback]=data=>{cleanup();resolve(data);};
    tag.onerror=()=>{cleanup();reject(new Error('Cannot contact Dashboard Apps Script.'));};
    tag.src=API+'?'+new URLSearchParams({action,callback,...params}).toString();
    tag.async=true;document.body.appendChild(tag);
  });
}
function parseCSV(text,delimiter){
  const rows=[];let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(ch===delimiter&&!quoted){row.push(field);field='';}
    else if((ch==='\r'||ch==='\n')&&!quoted){
      if(ch==='\r'&&text[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.some(x=>trim(x)))rows.push(row);
      row=[];
    }else field+=ch;
  }
  row.push(field);if(row.some(x=>trim(x)))rows.push(row);
  return rows;
}
function findDelimiter(text){
  const candidates=[',','\t',';'];
  const first=text.split(/\r?\n/,1)[0];
  return candidates.reduce((best,char)=>first.split(char).length>first.split(best).length?char:best,',');
}
function guessHeader(field){return trim(field).toLowerCase().replace(/[_-]/g,' ').replace(/\s+/g,' ');}
function bestHeader(field,aliases){
  const name=aliases.map(guessHeader);
  let index=headers.findIndex(x=>name.includes(guessHeader(x)));
  if(index<0)index=headers.findIndex(x=>name.some(alias=>guessHeader(x).includes(alias)));
  return index<0?-1:index;
}
function setOptions(id,preferred){
  const sel=$(id);sel.innerHTML='<option value="">— Choose column —</option>'+headers.map((value,i)=>`<option value="${i}">${escapeHtml(value||'Column '+(i+1))}</option>`).join('');
  if(preferred>=0)sel.value=String(preferred);
}
function parseDate(input,format){
  const value=trim(input);
  if(!value)return '';
  const iso=value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(iso)return checkedDate(+iso[1],+iso[2],+iso[3]);
  const slash=value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(slash){
    const a=+slash[1],b=+slash[2],y=+slash[3];
    return format==='dmy'?checkedDate(y,b,a):checkedDate(y,a,b);
  }
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  return checkedDate(d.getFullYear(),d.getMonth()+1,d.getDate());
}
function checkedDate(y,m,d){
  const dt=new Date(y,m-1,d);
  if(dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d)return '';
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function validUrl(value){try{
  const u=new URL(trim(value));return u.protocol==='https:'&&
    ['facebook.com','fb.watch'].some(x=>u.hostname===x||u.hostname.endsWith('.'+x));
}catch(_){return false;}}
function canonicalUrl(url){return trim(url).toLowerCase().split(/[?#]/)[0].replace(/\/+$/,'');}
function summarizeCaption(value){
  // Meta's Title column frequently contains the entire multiline caption.
  // For monitoring, use the first meaningful line as a human-readable topic.
  const lines=trim(value).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  let summary=(lines[0]||trim(value)).replace(/\s+/g,' ').trim();
  const maximum=160;
  if(summary.length>maximum){
    summary=summary.slice(0,maximum+1);
    const lastSpace=summary.lastIndexOf(' ');
    if(lastSpace>90)summary=summary.slice(0,lastSpace);
    else summary=summary.slice(0,maximum);
    summary+='…';
  }
  return summary;
}
function loadPreview(){
  const di=$('mapDate').value,ti=$('mapTitle').value,ui=$('mapUrl').value;
  if(di===''||ti===''||ui===''){$('fileInfo').textContent='Select all three CSV columns.';return;}
  const dateFmt=$('dateFormat').value,seen=new Set();let skipped=0;
  candidateRows=csvRows.map(row=>({
    date:parseDate(row[+di],dateFmt),
    title:summarizeCaption(row[+ti]),
    url:trim(row[+ui])
  })).filter(row=>{
    const key=canonicalUrl(row.url);
    if(!row.date||!row.title||!validUrl(row.url)||seen.has(key)){skipped++;return false;}
    seen.add(key);return true;
  });
  $('statRows').textContent=csvRows.length+' CSV rows';
  $('statReady').textContent=candidateRows.length+' ready to import';
  $('statSkipped').textContent=skipped+' invalid / duplicate rows skipped';
  $('previewBody').innerHTML=candidateRows.slice(0,20).map(row=>`<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.title)}</td><td class="url-cell">${escapeHtml(row.url)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">No valid rows. Check column mapping, date format and URLs.</td></tr>';
  $('previewSection').hidden=false;
  $('importBtn').disabled=!candidateRows.length;
  info('');
}
$('csvFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];
  $('mappingSection').hidden=true;$('previewSection').hidden=true;csvRows=[];headers=[];
  if(!file)return;
  if(file.size>10*1024*1024){$('fileInfo').textContent='CSV is larger than 10 MB. Split it into smaller monthly exports.';return;}
  try{
    const text=await file.text(),rows=parseCSV(text,findDelimiter(text));
    if(rows.length<2)throw new Error('CSV needs a header row and at least one post.');
    headers=rows[0].map((x,i)=>trim(x)||'Column '+(i+1));
    csvRows=rows.slice(1);
    const date=bestHeader('date',['publish time','published at','publish date','post date','date published','created time','publication date','published','created date','date']);
    const title=bestHeader('title',['post topic','post title','title','caption','message','description','post text','content','text']);
    const url=bestHeader('url',['post permalink','permalink','post url','facebook post url','link to post','permalink url','url','link']);
    setOptions('mapDate',date);setOptions('mapTitle',title);setOptions('mapUrl',url);
    const metaExport=headers.some(x=>guessHeader(x)==='publish time')&&
      headers.some(x=>guessHeader(x)==='permalink');
    $('fileInfo').textContent=metaExport
      ? `Meta post export detected (${csvRows.length} records). Auto-mapped Publish time, Title and Permalink. Do not select the "Date" column; it contains the insights period (e.g. Lifetime).`
      : `Loaded ${csvRows.length} row(s) from ${file.name}. Verify the three mappings below.`;
    $('mappingSection').hidden=false;
  }catch(error){$('fileInfo').textContent=error.message;}
});
$('previewBtn').addEventListener('click',loadPreview);
$('importBtn').addEventListener('click',async()=>{
  if(activeImport||!candidateRows.length)return;
  const pin=$('importPin').value;
  if(!pin){info('Enter the OSC import access code before importing.','error');return;}
  if(!confirm(`Append up to ${candidateRows.length} new published posts to the monitoring Sheet? Existing URLs will be skipped.`))return;
  activeImport=true;$('importBtn').disabled=true;
  let added=0,duplicates=0;
  try{
    // Short GET URLs for existing JSONP infrastructure. Backend always deduplicates.
    for(let i=0;i<candidateRows.length;i+=3){
      const batch=candidateRows.slice(i,i+3);
      $('progressText').textContent=`Processing ${Math.min(i+3,candidateRows.length)} / ${candidateRows.length}…`;
      const result=await api('importMonitoringPosts',{pin,records:JSON.stringify(batch)});
      if(!result.success)throw new Error(result.message||'Import failed.');
      added+=Number(result.imported||0);duplicates+=Number(result.duplicates||0);
    }
    info(`${added} posts imported. ${duplicates} existing URLs skipped. The interns can now assign SDGs.`, 'ok');
    $('progressText').textContent='Import complete';
  }catch(error){info(`${error.message} Already imported batches remain saved; repeating the import will skip their URLs.`,'error');}
  finally{activeImport=false;$('importBtn').disabled=false;}
});
})();
