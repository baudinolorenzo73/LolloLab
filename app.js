'use strict';
const $=id=>document.getElementById(id), DB='repo-atlas.db.v1', PREF='repo-atlas.settings.v1';
let repos=[], chosen=new Set(), current=null, editing=null, prefs={}, googleToken='', busy=false, storageOK=true;
let generation=0, fileGeneration=-1, driveGeneration=-1;
let fileHandle=null, fileQueue=Promise.resolve(), fileError='', lastFile='', formDirty=false, importMode='merge';
let editorDraft=null;
let editorPhotos=[];
let photosLoading=false, editorSession=0;
let bundledSeed=[], bundledSeedVersion=0, seedVersionApplied=0;
const session={apiKey:'',githubKey:''};
let googleAuth={token:'',expiresAt:0,scopes:[]};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const priorityRank={Alta:0,Media:1,Bassa:2};
function message(s){$('message').textContent=s;$('message').dataset.kind='info';$('message').setAttribute('role','status');$('errorActions').hidden=true}
function showError(error,operation='app'){
  const e=errorInfo(error),code=e.code||'UNKNOWN',entry=ERROR_HELP[code]||ERROR_HELP.UNKNOWN;
  message(e.message);$('message').dataset.kind='error';$('message').setAttribute('role','alert');
  $('errorActions').hidden=false;$('errorSettingsBtn').hidden=!entry[2];$('errorSettingsBtn').dataset.field=entry[2];
  if($('settings').open)$('settingsFeedback').textContent=e.message;
  if($('editor').open)$('editorFeedback').textContent=e.message;
  if($('captureDialog').open)$('captureFeedback').textContent=e.message;
  recordDiagnostic(code,{...e.meta,operation,level:'error'});
  renderConfigStatus();return e;
}
function repoId(value){let s=String(value).trim().replace(/^https?:\/\/(www\.)?github\.com\//i,'').split(/[?#]/)[0].replace(/\/+$/,'').replace(/\.git$/,'');if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9_.-]+$/.test(s)||s.split('/').some(x=>x==='.'||x==='..'))throw new AtlasError('REPO_INVALID');return s}
function normalize(r){
  if(!r||typeof r!=='object')throw new AtlasError('ARCHIVE_INVALID');
  const kind=['github','web','idea'].includes(r.kind)?r.kind:'github';
  const id=kind==='github'?repoId(r.id||r.url):r.id||kind+':'+crypto.randomUUID();
  if(kind!=='github'&&!new RegExp('^'+kind+':[a-zA-Z0-9_-]{8,80}$').test(id))throw new AtlasError('ARCHIVE_INVALID');
  const url=kind==='github'?'https://github.com/'+id:webUrl(r.url,kind==='idea');
  const out={id,kind,url,title:kind==='github'?id:kind==='idea'?'Idea senza titolo':new URL(url).hostname,category:'Altro',priority:'Media',status:'Da controllare',description:'',project:'',reuse:'',tags:'',notes:'',analysis:'',readme:'',checkedAt:'',aiAt:'',inspectionReport:'',updateState:'unchecked',rating:'',reviewDate:'',testResult:'',createdAt:''};
  for(const key of Object.keys(out))if(!['id','kind','url'].includes(key)&&typeof r[key]==='string')out[key]=r[key].slice(0,100000);
  if(!out.title.trim())out.title=kind==='github'?id:'Idea senza titolo';
  if(out.status==='Da valutare')out.status='Da controllare';
  if(!(out.priority in priorityRank))out.priority='Media';
  if(!/^[1-5]$/.test(out.rating))out.rating='';
  if(r.github&&typeof r.github==='object'&&kind==='github')out.github={stars:Number(r.github.stars)||0,language:String(r.github.language||''),license:String(r.github.license||''),pushed:String(r.github.pushed||''),archived:!!r.github.archived,description:String(r.github.description||''),sha:String(r.github.sha||''),previousSha:String(r.github.previousSha||'')};
  if(r.capture)out.capture=normalizeCapture(r.capture);
  if(r.photos!==undefined){if(!Array.isArray(r.photos)||r.photos.length>8)throw new AtlasError('CAPTURE_INVALID');out.photos=r.photos.map(imageDataUrl)}
  return out;
}
function snapshot(){return {schemaVersion:4,seedVersion:seedVersionApplied,exportedAt:new Date().toISOString(),repositories:repos.map(normalize),settings:{provider:prefs.provider||'ollama',model:prefs.model||'',googleClient:prefs.googleClient||'',githubOwner:githubOwner(),theme:prefs.theme||'system'}}}
function storageStatus(){const text=`File: ${fileGeneration===generation?'salvato'+(lastFile?' ('+lastFile+')':''):'modifiche da salvare'}${prefs.googleClient?' · Drive: '+(driveGeneration===generation?'copia confermata':'backup da fare'):''} · Browser: ${storageOK?'copia di emergenza disponibile':'copia di emergenza non confermata'}${fileError?' · ERRORE: '+fileError:''}`;$('saveStatus').textContent=text;$('connection').textContent=fileGeneration===generation?'● Salvato su file':'○ Da salvare su file';$('connection').dataset.saved=String(fileGeneration===generation)}
function emergencyDraft(){
  const data=snapshot();let smallSaved=false;
  try{const text=JSON.stringify(data);if(text.length<2*1024*1024){localStorage.setItem(DB,text);smallSaved=true}localStorage.setItem(PREF,JSON.stringify(data.settings))}catch{}
  storageOK=smallSaved;
  queueLargeDraft(data).then(saved=>{if(saved)storageOK=true;else if(!smallSaved)recordDiagnostic('BROWSER_STORAGE',{operation:'emergency_save'});storageStatus()}).catch(()=>{if(!smallSaved){storageOK=false;recordDiagnostic('BROWSER_STORAGE',{operation:'emergency_save'});storageStatus()}});
}

function save(){generation++;emergencyDraft();render();storageStatus()}
function validateSnapshot(data){if(!data||typeof data!=='object')throw new AtlasError('ARCHIVE_INVALID');if(data.schemaVersion!==undefined&&![1,2,3,4].includes(data.schemaVersion))throw new AtlasError('ARCHIVE_VERSION');const list=Array.isArray(data)?data:data.repositories;if(!Array.isArray(list))throw new AtlasError('ARCHIVE_INVALID');if(list.length>5000)throw new AtlasError('ARCHIVE_TOO_LARGE');const valid=list.map(normalize);if(new Set(valid.map(recordKey)).size!==valid.length)throw new AtlasError('ARCHIVE_DUPLICATE');return valid}
function convertIdeas(list){if(list.length>5000)throw new AtlasError('ARCHIVE_TOO_LARGE');return list.map(x=>{if(!x||typeof x!=='object')throw new AtlasError('ARCHIVE_INVALID');let url=String(x.link||'').trim();if(url&&!/^https?:\/\//i.test(url))url='https://'+url;url=webUrl(url,true);const statuses={'Da valutare':'Da controllare','Da testare':'Da provare','In test':'In test','Approvato':'Approvato','Scartato':'Scartato','Archiviato':'Archiviato'};const photos=Array.isArray(x.images)?x.images.map(i=>imageDataUrl(i.f)):[];if(photos.length>8)throw new AtlasError('CAPTURE_INVALID');return normalize({id:'idea:'+crypto.randomUUID(),kind:'idea',url,title:String(x.title||'Idea senza titolo'),description:String(x.explanation||''),notes:[x.notes||'',x.screenshot?'Link immagine originale: '+x.screenshot:''].filter(Boolean).join('\n'),category:String(x.category||'Altro'),status:statuses[x.status]||'Da controllare',priority:x.priority,tags:Array.isArray(x.tags)?x.tags.join(', '):String(x.tags||''),rating:String(x.rating||''),reviewDate:String(x.reviewDate||''),testResult:String(x.testResult||''),createdAt:String(x.createdAt||''),photos})})}
function applySettings(data){if(data.settings&&typeof data.settings==='object')for(const key of ['provider','model','googleClient','githubOwner','theme'])if(typeof data.settings[key]==='string')prefs[key]=data.settings[key].slice(0,300)}
function catalogSeedVersion(data){const n=Number(!Array.isArray(data)&&data?.seedVersion);return Number.isInteger(n)&&n>=0?n:0}
function loadCatalog(data){repos=validateSnapshot(data);seedVersionApplied=catalogSeedVersion(data);applySettings(data)}
function mergeBundledSeed(){if(seedVersionApplied>=bundledSeedVersion)return {changed:false,added:0};const ids=new Set(repos.map(r=>r.id.toLowerCase()));const missing=bundledSeed.filter(r=>!ids.has(r.id.toLowerCase()));repos.push(...missing.map(normalize));seedVersionApplied=bundledSeedVersion;return {changed:true,added:missing.length}}
async function openArchive(){importMode='open';$('importFile').click()}
async function saveFile(){if(formDirty||captureDraft)throw new AtlasError('DRAFT_UNSAVED');if(fileGeneration===generation)return true;if(window.showSaveFilePicker){if(!fileHandle)fileHandle=await window.showSaveFilePicker({suggestedName:'Repo_Atlas_catalogo.json',types:[{description:'Archivio Repo Atlas',accept:{'application/json':['.json']}}]});const version=generation,data=JSON.stringify(snapshot(),null,2),stream=await fileHandle.createWritable();await stream.write(data);await stream.close();fileGeneration=version;lastFile=fileHandle.name;fileError='';storageStatus();message('Archivio completo scritto su file: '+lastFile);return true}$('confirmDownload').dataset.version=String(generation);downloadBlob(JSON.stringify(snapshot(),null,2),'application/json','Repo_Atlas_catalogo.json');$('confirmDownload').showModal();message('Download JSON richiesto. Verifica il file nei Download: il browser non permette di confermare automaticamente la scrittura.');return false}
async function saveAll(){
  const fileOk=await saveFile();
  if(fileOk===false||!prefs.googleClient||driveGeneration===generation)return;
  await saveDrive();
}
function filtered(){
  const q=$('search').value.toLowerCase();
  return repos.filter(r=>matchesCollection(r)&&(!$('category').value||r.category===$('category').value)&&(!$('priority').value||r.priority===$('priority').value)&&(!$('statusFilter').value||r.status===$('statusFilter').value)&&(!q||[r.id,r.title,r.url,r.description,r.notes,r.project,r.reuse,r.tags,r.analysis].join(' ').toLowerCase().includes(q)))
    .sort((a,b)=>$('sort').value==='name'?labelFor(a).localeCompare(labelFor(b)):$('sort').value==='stars'?(b.github?.stars||0)-(a.github?.stars||0):(priorityRank[a.priority]-priorityRank[b.priority]||labelFor(a).localeCompare(labelFor(b))));
}
function targets(){return chosen.size?repos.filter(r=>chosen.has(r.id)):filtered()}
function batchTargets(){return filtered().filter(r=>chosen.has(r.id))}
function render(){
  const cats=[...new Set(repos.map(r=>r.category))].sort(),selected=$('category').value;
  $('category').innerHTML='<option value="">Tutte le categorie</option>'+cats.map(c=>'<option>'+escapeHTML(c)+'</option>').join('');$('category').value=cats.includes(selected)?selected:'';
  const rows=filtered(),visible=new Set(rows.map(r=>r.id));for(const id of chosen)if(!visible.has(id))chosen.delete(id);
  if(!visible.has(current))current=rows[0]?.id||null;
  $('bulkActions').hidden=!chosen.size;$('selectedCount').textContent=chosen.size;$('clearSelection').hidden=!chosen.size;
  $('count').textContent=repos.filter(r=>!isMine(r)).length;$('aiCount').textContent=repos.filter(r=>r.kind!=='github').length;$('highCount').textContent=repos.filter(isMine).length;
  const headings={review:['Progetti da controllare','Repository e risorse trovati: conserva ciò che potresti riutilizzare.'],ideas:['Idee e link','Spunti, articoli e idee personali da sviluppare.'],captures:['Schermate da valutare','Screenshot e analisi conservati per essere ripresi in seguito.'],mine:['I miei progetti','Repository GitHub dell’account '+githubOwner()+'.'],all:['Tutto l’archivio','Idee, fonti e repository, compresi i tuoi progetti GitHub.']};
  const heading=headings[$('collection').value]||headings.review;$('catalogTitle').textContent=heading[0];$('catalogSubtitle').textContent=heading[1];$('loadMineBtn').hidden=$('collection').value!=='mine';
  $('scope').textContent=rows.length+' risultati · '+chosen.size+' selezionati · Esportazione: '+(chosen.size?'selezionati':'risultati filtrati')+(storageOK?'':' · Copia di emergenza browser non disponibile');
  $('list').innerHTML=rows.map(r=>'<article class="row '+(current===r.id?'active':'')+'"><input type="checkbox" data-check="'+escapeHTML(r.id)+'" '+(chosen.has(r.id)?'checked':'')+' aria-label="Seleziona '+escapeHTML(labelFor(r))+'"><div class="row-content"><button class="row-title" data-open="'+escapeHTML(r.id)+'">'+escapeHTML(labelFor(r))+'</button><small class="muted">'+escapeHTML(r.description.slice(0,150)||r.reuse.slice(0,150)||'Aggiungi cosa ti interessa e come riutilizzarlo.')+'</small><div class="row-meta"><span class="badge">'+escapeHTML(kindLabel(r.kind))+'</span><span>'+escapeHTML(r.category)+' · '+escapeHTML(r.status)+'</span>'+(r.updateState==='changed'?'<span class="update-badge">Aggiornamenti GitHub</span>':'')+'</div></div></article>').join('')||'<div class="empty">Nessuna scheda in questa vista. Aggiungi un’idea, cerca sul web/GitHub o cambia i filtri.</div>';
  $('selectAll').textContent=rows.length&&rows.every(r=>chosen.has(r.id))?'Deseleziona risultati':'Seleziona risultati';
  $('ownedProjects').innerHTML=repos.filter(isMine).map(r=>'<option value="'+escapeHTML(r.id)+'"></option>').join('');
  renderDetail();updateCapabilities();renderDiscovery();
}
function renderDetail(){
  const r=repos.find(x=>x.id===current);
  if(!r){$('detail').innerHTML='<h2>Archivio di idee e progetti</h2><p>Apri una scheda per leggere cosa vuoi riutilizzare.</p>';return}
  const g=r.github,githubOnly=r.kind==='github';
  $('detail').innerHTML='<button class="mobile-back" data-action="back">← Torna al catalogo</button><span class="eyebrow detail-eyebrow">'+escapeHTML(isMine(r)?'Il mio progetto GitHub':kindLabel(r.kind))+'</span><h2>'+escapeHTML(labelFor(r))+'</h2><p>'+escapeHTML(r.description)+'</p>'+
    (r.capture?'<details class="capture-original"><summary>Schermata originale e analisi iniziale</summary><img class="capture-image" src="'+r.capture.imageDataUrl+'" alt="Schermata archiviata"><p class="muted">'+escapeHTML(r.capture.origin)+' · '+escapeHTML(r.capture.capturedAt)+' · '+escapeHTML(r.capture.provider)+' '+escapeHTML(r.capture.model)+'</p><pre>'+escapeHTML(r.capture.originalAnalysis||'Archiviata senza analisi IA.')+'</pre></details>':'')+
    '<div class="reuse-box"><h3>Cosa voglio riutilizzare</h3><p class="preserve-lines">'+escapeHTML(r.reuse||'Annota la funzione, il codice o l’idea che ti interessa recuperare.')+'</p><p class="muted">Per: '+escapeHTML(r.project||'nessun progetto collegato')+'</p></div><p class="muted">Tag: '+escapeHTML(r.tags||'nessuno')+' · '+escapeHTML(r.priority)+' priorità · '+escapeHTML(r.status)+'</p><p>Valutazione: '+escapeHTML(r.rating?('★'.repeat(Math.min(5,Number(r.rating)||0))):'non valutata')+' · Da rivedere: '+escapeHTML(r.reviewDate||'non impostato')+'</p>'+(r.testResult?'<h3>Risultato delle prove</h3><p class="preserve-lines">'+escapeHTML(r.testResult)+'</p>':'')+(r.photos?.length?'<details><summary>Foto e screenshot ('+r.photos.length+')</summary>'+r.photos.map((p,i)=>'<a href="'+p+'" target="_blank" rel="noopener"><img class="capture-image" src="'+p+'" alt="Foto '+(i+1)+'"></a>').join('')+'</details>':'')+
    (g?'<p><span class="badge">★ '+g.stars+'</span> '+escapeHTML(g.language)+' · Licenza: '+escapeHTML(g.license||'non dichiarata')+'</p><p class="muted">Ultimo push: '+escapeHTML(g.pushed||'n/d')+'<br>Controllo: '+escapeHTML(r.checkedAt||'non effettuato')+'</p>':'')+
    (r.updateState==='changed'?'<p class="update-badge">Il repository è cambiato dall’ultimo controllo.</p>':'')+
    '<div class="actions">'+(r.url?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(r.url)+'">'+(githubOnly?'GitHub':'Apri fonte')+' ↗</a>':'')+
    (githubOnly?'<button data-action="refresh">Controlla aggiornamenti GitHub</button>':'')+
    '<button data-action="analyze" class="primary">Spiegami con IA</button><button data-action="edit">Modifica</button><button data-action="duplicate">Duplica</button><button data-action="delete" class="danger">Rimuovi</button>'+
    (githubOnly&&g?.sha&&g?.previousSha&&g.sha!==g.previousSha?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(r.url+'/compare/'+g.previousSha+'...'+g.sha)+'">Vedi modifiche ↗</a>':'')+'</div>'+
    (r.inspectionReport?'<details><summary>Ultimo rapporto di controllo</summary><pre>'+escapeHTML(r.inspectionReport)+'</pre></details>':'')+
    '<details><summary>Analisi IA</summary><p class="muted">'+(r.aiAt?'Analisi del '+escapeHTML(r.aiAt):githubOnly?'Analisi di README e informazioni salvate.':'L’IA usa i testi salvati: non legge automaticamente il sito.')+'</p><pre>'+escapeHTML(r.analysis||'Nessuna analisi. Servono assistente PC e modello configurato.')+'</pre></details><h3>Note personali</h3><p class="preserve-lines">'+escapeHTML(r.notes||'Nessuna nota.')+'</p>'+
    (r.readme?'<details><summary>README originale (testo)</summary><pre>'+escapeHTML(r.readme)+'</pre></details>':'');
}
function edit(r=null){
  editorSession++;photosLoading=false;$('saveEntryBtn').disabled=false;editorDraft=r;editing=r?.id||null;formDirty=false;$('editorFeedback').textContent='';$('editorDetails').open=!!r;
  $('editTitle').textContent=r?'Modifica scheda':'Aggiungi idea o progetto';$('entryKind').value=r?.kind||'github';
  $('entryTitle').value=r?.title||'';$('repoUrl').value=r?.kind==='github'?r.id:r?.url||'';
  $('repoCategory').value=r?.category||'Altro';$('repoPriority').value=r?.priority||'Media';$('repoStatus').value=r?.status||'Da controllare';
  $('repoDescription').value=r?.description||'';$('repoProject').value=r?.project||'';$('repoNotes').value=r?.notes||'';$('repoReuse').value=r?.reuse||'';$('repoTags').value=r?.tags||'';
  $('repoRating').value=r?.rating||'';$('repoReview').value=r?.reviewDate||'';$('repoTest').value=r?.testResult||'';editorPhotos=[...(r?.photos||[])];showEditorPhotos();
  updateEditorKind();$('editor').showModal();
}
function showEditorPhotos(){$('photoList').textContent='';editorPhotos.forEach((photo,i)=>{const row=document.createElement('div'),img=document.createElement('img'),button=document.createElement('button');img.src=photo;img.alt='Foto '+(i+1);img.style.maxWidth='120px';button.type='button';button.textContent='Rimuovi foto '+(i+1);button.onclick=()=>{editorPhotos.splice(i,1);formDirty=true;showEditorPhotos()};row.append(img,button);$('photoList').append(row)})}
async function prepareEditorPhoto(f){if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>20*1024*1024)throw Error('Usa immagini JPEG, PNG o WebP fino a 20 MB.');if(f.size<=CAPTURE_LIMIT){const value=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Immagine non leggibile'));reader.readAsDataURL(f)});return imageDataUrl(value)}const url=URL.createObjectURL(f);try{const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Immagine non leggibile'));image.src=url});const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)throw Error('Impossibile ridurre la foto su questo dispositivo.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);return imageDataUrl(canvas.toDataURL('image/jpeg',0.8))}finally{URL.revokeObjectURL(url)}}
async function addEditorPhotos(input){const files=Array.from(input.files);input.value='';if(!files.length||photosLoading)return;const sessionId=editorSession;photosLoading=true;formDirty=true;$('saveEntryBtn').disabled=true;$('editorFeedback').textContent='Caricamento immagini…';try{if(editorPhotos.length+files.length>8)throw Error('Puoi aggiungere massimo 8 immagini.');const added=[];for(const f of files)added.push(await prepareEditorPhoto(f));if(sessionId!==editorSession)return;editorPhotos.push(...added);showEditorPhotos();$('editorFeedback').textContent='Immagini pronte. Premi Salva nell’archivio.'}catch(e){if(sessionId===editorSession)$('editorFeedback').textContent=e.message}finally{if(sessionId===editorSession){photosLoading=false;$('saveEntryBtn').disabled=false}}}
$('repoPhotos').onchange=e=>addEditorPhotos(e.target);$('repoCamera').onchange=e=>addEditorPhotos(e.target);
function newEntry(kind='idea',record=null){
  edit(record);editing=null;editorDraft=record;$('entryKind').value=kind;$('editTitle').textContent='Archivia idea o progetto';updateEditorKind();
}
function updateEditorKind(){
  const kind=$('entryKind').value;$('sourceLabel').textContent=kind==='github'?'URL GitHub o proprietario/repository':kind==='web'?'Indirizzo della pagina web':'Fonte facoltativa (HTTP/HTTPS)';
  $('repoUrl').required=kind!=='idea';$('entryTitle').required=false;
  $('entryHint').textContent=kind==='idea'?'Puoi salvare anche un’idea senza link. Descrivi cosa vorresti realizzare.':kind==='web'?'Incolla il link di un articolo, uno strumento o un progetto trovato sul web.':'Salva un repository trovato; se appartiene al tuo account apparirà in I miei progetti.';
}
async function jsonFetch(url,options={}){
  const service=String(url).startsWith('https://api.github.com/')?'github':String(url).includes('googleapis.com/')?'google':String(url).startsWith('./api/')?'local':/^https:\/\/(api\.groq\.com|openrouter\.ai|api\.openai\.com)\/|^http:\/\/(127\.0\.0\.1|localhost):11434\//.test(String(url))?'ai':'app';
  const controller=new AbortController(),limit=service==='ai'&&String(url).includes('/chat/completions')?240000:45000;
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},limit);
  try{
    const res=await fetch(url,{...options,signal:controller.signal});let body;
    try{body=await res.json()}catch{if(!res.ok)throw httpError(service,res.status);throw new AtlasError('RESPONSE_INVALID',{service,status:res.status})}
    if(!body||typeof body!=='object')throw new AtlasError('RESPONSE_INVALID',{service,status:res.status});
    if(!res.ok){
      if(service==='google'&&res.status===401)googleAuth={token:'',expiresAt:0,scopes:[]};
      if(service==='github'&&res.status===403&&res.headers?.get('x-ratelimit-remaining')==='0')body.rateLimited=true;
      throw httpError(body.service||service,body.remoteStatus||res.status,body);
    }
    return body;
  }catch(e){
    const failure=e instanceof AtlasError?e:new AtlasError(timedOut?'TIMEOUT':service==='ai'&&String(url).includes(':11434')?'OLLAMA_OFFLINE':'NETWORK',{service});
    recordDiagnostic(failure.code,{...failure.meta,operation:'request'});throw failure;
  }finally{clearTimeout(timer)}
}
async function github(r){
  if(r.kind!=='github')throw new AtlasError('GITHUB_ONLY');
  message('Controllo aggiornamenti GitHub: '+r.id);const headers=githubHeaders(),root='https://api.github.com/repos/'+r.id;
  const meta=await jsonFetch(root,{headers});let readme=r.readme||'',sha='';
  try{const data=await jsonFetch(root+'/readme',{headers});if(data.encoding==='base64')readme=new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0))).slice(0,40000)}catch(e){recordDiagnostic(e.code||'UNKNOWN',{operation:'github_readme',service:'github'})}
  try{const commits=await jsonFetch(root+'/commits?per_page=1',{headers});const candidate=commits[0]?.sha;if(typeof candidate==='string'&&/^[a-f0-9]{40,64}$/.test(candidate))sha=candidate}catch(e){recordDiagnostic(e.code||'UNKNOWN',{operation:'github_commits',service:'github'})}
  const old=r.github||{},wasChecked=!!r.checkedAt;
  const changed=!!((old.sha&&sha&&old.sha!==sha)||(old.pushed&&meta.pushed_at&&old.pushed!==meta.pushed_at));
  r.updateState=wasChecked?(changed?'changed':'same'):'new';
  r.github={stars:meta.stargazers_count||0,language:meta.language||'',license:meta.license?.spdx_id||'',pushed:meta.pushed_at||'',archived:!!meta.archived,sha:sha||old.sha||'',previousSha:changed?old.sha||'':old.previousSha||'',description:meta.description||''};
  r.readme=readme;if(!r.description&&meta.description)r.description=meta.description;r.checkedAt=new Date().toISOString();save();return r;
}
async function analyze(r){checkAiConfig();if(r.capture){const result=await ia('capture/analyze',{provider:prefs.provider||'ollama',model:prefs.model,apiKey:session.apiKey,imageDataUrl:r.capture.imageDataUrl});r.analysis=result.analysis;r.aiAt=new Date().toISOString();save();return;}if(r.kind==='github'&&!r.readme)await github(r);if(r.kind!=='github'&&![r.description,r.notes,r.reuse].some(t=>t?.trim()))throw new AtlasError('IDEA_TEXT_REQUIRED');message('Analisi IA: '+r.id+'…');const data=await ia('analyze',{provider:prefs.provider,model:prefs.model,apiKey:session.apiKey,repository:{id:r.id,kind:r.kind,title:r.title,url:r.url,description:r.description,reuse:r.reuse,notes:r.notes,github:r.github,readme:r.readme,project:r.project}});r.analysis=data.analysis;r.aiAt=new Date().toISOString();save()}
async function batch(fn){if(busy)return;busy=true;updateCapabilities();try{let list=batchTargets();if(!list.length)throw new AtlasError('SELECTION_MISSING');if(fn===github){list=list.filter(r=>r.kind==='github');if(!list.length)throw new AtlasError('GITHUB_ONLY');}if(fn===analyze)checkAiConfig();if(fn===analyze&&!confirm(`Analizzare ${list.length} repository? Il provider IA configurato riceverà README e metadati. Le API possono avere costi.`))return;const errors=[];for(let i=0;i<list.length;i++){message(`${i+1}/${list.length} · ${list[i].id}`);try{await fn(list[i])}catch(e){errors.push(list[i].id+': '+showError(e,fn===analyze?'analyze':'github').message)}}message(`Completati ${list.length-errors.length}/${list.length}. ${fn===github?'Aggiornati dall’ultimo controllo: '+list.filter(r=>r.updateState==='changed').length+'.':''}`+(errors.length?'\n'+errors.join('\n'):''))}catch(e){showError(e,fn===analyze?'analyze':'github')}finally{busy=false;updateCapabilities()}}
function downloadBlob(data,type,name){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportRows(){return [['Titolo','Tipo','ID','URL','Categoria','Priorità','Stato','Descrizione','Da riutilizzare','Progetto collegato','Tag','Note','Stelle','Linguaggio','Licenza','Archiviato','Ultimo push','Controllato','Analisi IA','Data analisi','Aggiornamenti'],...targets().map(r=>[labelFor(r),kindLabel(r.kind),r.id,r.url,r.category,r.priority,r.status,r.description,r.reuse,r.project,r.tags,r.notes,r.github?.stars??'',r.github?.language||'',r.github?.license||'',r.github?.archived?'Sì':'No',r.github?.pushed||'',r.checkedAt,r.analysis,r.aiAt,r.updateState])]}

function xml(s){return String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function zipStore(files){const enc=new TextEncoder(),chunks=[],central=[];let offset=0;function head(n){const b=new Uint8Array(n);return [b,new DataView(b.buffer)]}for(const [name,text] of Object.entries(files)){const path=enc.encode(name),body=enc.encode(text),crc=crc32(body);let [h,v]=head(30);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,body.length,true);v.setUint32(22,body.length,true);v.setUint16(26,path.length,true);chunks.push(h,path,body);let [c,w]=head(46);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc,true);w.setUint32(20,body.length,true);w.setUint32(24,body.length,true);w.setUint16(28,path.length,true);w.setUint32(42,offset,true);central.push(c,path);offset+=30+path.length+body.length}const len=central.reduce((s,b)=>s+b.length,0);let [e,v]=head(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,Object.keys(files).length,true);v.setUint16(10,Object.keys(files).length,true);v.setUint32(12,len,true);v.setUint32(16,offset,true);return new Blob([...chunks,...central,e])}
function makeXlsx(rows){const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};const sheet='<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="21" width="28" customWidth="1"/></cols><sheetData>'+rows.map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>`<c r="${col(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xml(String(v).slice(0,32767))}</t></is></c>`).join('')}</row>`).join('')+`</sheetData><autoFilter ref="A1:U${rows.length}"/></worksheet>`;return zipStore({'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>','_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Repository" sheetId="1" r:id="rId1"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>','xl/worksheets/sheet1.xml':sheet})}
function printReport(){const list=targets();$('printArea').innerHTML='<h1>Repo Atlas · Archivio idee e progetti</h1><p>'+new Date().toLocaleDateString('it-IT')+' · '+list.length+' progetti</p>'+list.map(r=>`<article class="print-repo"><h2>${escapeHTML(labelFor(r))}</h2><p>${escapeHTML(r.url)} · ${escapeHTML(r.category)} · Priorità ${escapeHTML(r.priority)} · ${escapeHTML(r.status)}</p><p>${escapeHTML(r.description)}</p><p>Da riutilizzare: ${escapeHTML(r.reuse)} · Per: ${escapeHTML(r.project)} · Tag: ${escapeHTML(r.tags)}</p>${r.analysis?'<pre>'+escapeHTML(r.analysis)+'</pre>':''}<p>${escapeHTML(r.notes)}</p></article>`).join('');window.print()}
function checkAiConfig(){
  const provider=prefs.provider||'ollama';
  if(provider!=='ollama'&&!session.apiKey)throw new AtlasError('AI_KEY_MISSING');
  if(!prefs.model)throw new AtlasError('AI_MODEL_MISSING');
}
function checkGoogleConfig(){
  if(!prefs.googleClient)throw new AtlasError('GOOGLE_CLIENT_MISSING');
  if(!/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(prefs.googleClient))throw new AtlasError('GOOGLE_CLIENT_INVALID');
}
function oauthError(value){
  const code={access_denied:'GOOGLE_DENIED',popup_failed_to_open:'GOOGLE_POPUP',popup_closed:'GOOGLE_CLOSED',invalid_client:'GOOGLE_CONFIG',origin_mismatch:'GOOGLE_CONFIG',redirect_uri_mismatch:'GOOGLE_CONFIG',unauthorized_client:'GOOGLE_CONFIG',invalid_scope:'GOOGLE_SCOPE'}[value]||'GOOGLE_CONFIG';
  return new AtlasError(code,{service:'google'});
}
async function googleAccess(scope){
  checkGoogleConfig();
  const required=scope.split(/\s+/).filter(Boolean);
  if(googleAuth.token&&googleAuth.expiresAt>Date.now()+30000&&required.every(s=>googleAuth.scopes.includes(s)))return googleAuth.token;
  if(!window.google?.accounts?.oauth2)await loadGoogle();
  return new Promise((resolve,reject)=>{
    const client=google.accounts.oauth2.initTokenClient({client_id:prefs.googleClient,scope,
      callback:r=>{
        if(r.error){reject(oauthError(r.error));return}
        if(!r.access_token){reject(new AtlasError('GOOGLE_TOKEN_MISSING',{service:'google'}));return}
        const granted=String(r.scope||'').split(/\s+/);
        if(!required.every(s=>granted.includes(s))){reject(new AtlasError('GOOGLE_SCOPE',{service:'google'}));return}
        googleAuth={token:r.access_token,expiresAt:Date.now()+Math.max(0,Number(r.expires_in)||0)*1000,scopes:granted};
        recordDiagnostic('GOOGLE_CONNECTED',{operation:'google_connect',service:'google',level:'info'});renderConfigStatus();resolve(r.access_token);
      },error_callback:e=>reject(oauthError(e.type))});
    client.requestAccessToken({prompt:'consent'});
  });
}
let googleLibrary=null;
function loadGoogle(){
  if(window.google?.accounts?.oauth2)return Promise.resolve();
  if(!googleLibrary)googleLibrary=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';
    const timer=setTimeout(()=>{googleLibrary=null;script.remove();reject(new AtlasError('GOOGLE_LIBRARY',{service:'google'}))},15000);
    script.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.oauth2)resolve();else{googleLibrary=null;reject(new AtlasError('GOOGLE_LIBRARY',{service:'google'}))}};
    script.onerror=()=>{clearTimeout(timer);googleLibrary=null;reject(new AtlasError('GOOGLE_LIBRARY',{service:'google'}))};document.head.append(script);
  });
  return googleLibrary;
}
async function saveDrive(){if(formDirty)throw new AtlasError('DRAFT_UNSAVED');const version=generation,data=JSON.stringify(snapshot(),null,2),token=await googleAccess('https://www.googleapis.com/auth/drive.file');const boundary='repo_atlas_'+crypto.randomUUID().replaceAll('-',''),name='Repo_Atlas_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';const metadata={name,mimeType:'application/json',appProperties:{application:'repo-atlas',schema:'3'}};const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+data+'\r\n--'+boundary+'--';message('Salvataggio completo su Drive…');const saved=await jsonFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},body});if(!saved.id)throw new AtlasError('GOOGLE_VERIFY');const check=await jsonFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(saved.id)+'?fields=id,name,size,md5Checksum,webViewLink',{headers:{Authorization:'Bearer '+token}});if(Number(check.size)!==new TextEncoder().encode(data).length)throw new AtlasError('GOOGLE_VERIFY');driveGeneration=version;storageStatus();message('Backup completo confermato su Drive: '+check.name);if(check.webViewLink){const a=document.createElement('a');a.href=check.webViewLink;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Apri backup su Drive ↗';$('message').append(a)}}
async function run(fn){if(busy)return;busy=true;updateCapabilities();const operation=fn.name?fn.name.toLowerCase():'app';try{await fn()}catch(e){showError(e,operation)}finally{busy=false;updateCapabilities()}}
$('list').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b){current=b.dataset.open;document.body.classList.add('detail-open');render();if(matchMedia('(max-width:850px)').matches)$('detail').scrollIntoView({block:'start'})}});
$('list').addEventListener('change',e=>{const id=e.target.dataset.check;if(id){e.target.checked?chosen.add(id):chosen.delete(id);render()}});
$('detail').addEventListener('click',e=>{if(e.target.dataset.action!=='duplicate')return;const r=repos.find(x=>x.id===current);if(!r)return;const copy={...r,id:'idea:'+crypto.randomUUID(),kind:'idea',title:labelFor(r)+' (copia)',url:r.url||'',github:undefined,updateState:'unchecked'};newEntry('idea',copy);message('Modifica la copia e salvala come nuova idea.')});
$('detail').addEventListener('click',e=>{const a=e.target.dataset.action,r=repos.find(x=>x.id===current);if(a==='back'){document.body.classList.remove('detail-open');return}if(!a||!r||a==='duplicate')return;if(busy){message('Attendi il completamento dell’operazione in corso.');return}if(a==='edit')edit(r);else if(a==='delete'){if(confirm('Rimuovere '+r.id+' dal catalogo?')){repos=repos.filter(x=>x!==r);chosen.delete(r.id);current=null;document.body.classList.remove('detail-open');save()}}else run(async()=>{if(a==='refresh')await github(r);if(a==='analyze'){if(!confirm('Inviare al provider IA il contenuto della scheda e l’immagine, se presente? Verifica prima ciò che desideri condividere.'))return;await analyze(r)}message(a==='refresh'?(r.updateState==='changed'?'Aggiornamenti trovati: ':r.updateState==='new'?'Primo controllo registrato: ':'Nessun nuovo aggiornamento: ')+r.id:'Operazione completata: '+r.id)})});
for(const id of ['search','category','priority','statusFilter','sort','collection'])$(id).addEventListener(id==='search'?'input':'change',()=>{chosen.clear();render()});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>requestClose(b.closest('dialog')));
$('addIdeaBtn').onclick=()=>{$('addDialog').close();newEntry('idea')};
$('addWebBtn').onclick=()=>{$('addDialog').close();newEntry('web')};
$('addPhotoBtn').onclick=()=>{$('addDialog').close();showCapture()};
$('discoverBtn').onclick=()=>showView('discover');
$('discoverBackBtn').onclick=()=>showView('catalog');
$('entryKind').onchange=()=>{formDirty=true;updateEditorKind()};
$('editForm').onsubmit=e=>{
  e.preventDefault();if(photosLoading){$('editorFeedback').textContent='Attendi il caricamento delle immagini.';return}try{
    let kind=$('entryKind').value;const source=$('repoUrl').value.trim();
    if(kind==='idea'&&!$('entryTitle').value.trim()&&!editorPhotos.length){$('editorFeedback').textContent='Scrivi un titolo oppure aggiungi almeno una foto.';return}
    if(!editing&&!editorDraft&&kind==='idea'&&/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?(?:[?#].*)?$/i.test(source))kind='github';
    if(kind==='github'&&/^https?:\/\//i.test(source)&&!/^https?:\/\/(www\.)?github\.com\//i.test(source))kind='web';
    if(editing&&kind!==editorDraft?.kind&&!confirm('Cambiare tipo può rimuovere dati specifici della scheda originale, come le informazioni GitHub. Continuare?'))return;
    const id=kind==='github'?repoId(source):editorDraft?.kind===kind?editorDraft.id:kind+':'+crypto.randomUUID();
    const old=repos.find(r=>r.id===editing)||editorDraft||{};
    if(!editing&&repos.length>=5000)throw new AtlasError('ARCHIVE_TOO_LARGE');
    const autoTitle=kind==='idea'&&editorPhotos.length?'Foto da valutare · '+new Date().toLocaleString('it-IT'):undefined;
    const r=normalize({...((old.kind===kind&&old.id?.toLowerCase()===id.toLowerCase())?old:{}),id,kind,url:source,capture:old.capture,title:$('entryTitle').value.trim()||autoTitle,category:$('repoCategory').value.trim()||'Altro',priority:$('repoPriority').value,status:$('repoStatus').value,description:$('repoDescription').value,project:$('repoProject').value,reuse:$('repoReuse').value,tags:$('repoTags').value,notes:$('repoNotes').value,rating:$('repoRating').value,reviewDate:$('repoReview').value,testResult:$('repoTest').value,createdAt:old.createdAt||new Date().toISOString(),photos:editorPhotos});
    if(new TextEncoder().encode(JSON.stringify({...snapshot(),repositories:[...repos.filter(x=>x.id!==editing),r]})).length>ARCHIVE_LIMIT)throw new AtlasError('ARCHIVE_TOO_LARGE');
    if(repos.some(x=>x.id!==editing&&recordKey(x)===recordKey(r)))throw new AtlasError('REPO_DUPLICATE');
    repos=repos.filter(x=>x.id!==editing);repos.push(r);chosen.delete(editing);current=r.id;formDirty=false;
    $('collection').value=isMine(r)?'mine':r.kind==='github'?'review':'ideas';for(const field of ['search','category','priority','statusFilter'])$(field).value='';chosen.clear();save();$('editor').close();showView('catalog');message('Scheda salvata. Puoi riaprirla e aggiungere dettagli quando vuoi.');
  }catch(error){showError(error,'edit')}
};
$('clearSelection').onclick=()=>{chosen.clear();render()};
$('selectAll').onclick=()=>{const ids=filtered().map(r=>r.id),all=ids.every(x=>chosen.has(x));ids.forEach(x=>all?chosen.delete(x):chosen.add(x));render()};$('refreshAll').onclick=()=>batch(github);$('analyzeAll').onclick=()=>batch(analyze);
$('jsonBtn').onclick=()=>downloadBlob(JSON.stringify({schemaVersion:4,seedVersion:seedVersionApplied,exportedAt:new Date().toISOString(),repositories:targets()},null,2),'application/json','LolloLab_selezione.json');$('xlsxBtn').onclick=()=>downloadBlob(makeXlsx(exportRows()),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Repo_Atlas.xlsx');$('pdfBtn').onclick=printReport;
$('importBtn').onclick=()=>{importMode='merge';$('importFile').click()};
$('importFile').onchange=()=>run(async()=>{
  const f=$('importFile').files[0];
  $('importFile').value='';
  if(!f)return;
  if(f.size>ARCHIVE_LIMIT)throw new AtlasError('ARCHIVE_TOO_LARGE');
  const data=JSON.parse(await f.text()),valid=Array.isArray(data.ideas)?convertIdeas(data.ideas):validateSnapshot(data);
  if(importMode==='open'){
    if(!confirm('Aprire questo archivio completo? Sostituirà le schede in lavoro. Salva prima le modifiche che vuoi conservare.'))return;
    repos=valid;
    fileHandle=null;
    seedVersionApplied=catalogSeedVersion(data);
    chosen.clear();
    current=repos[0]?.id;
    applySettings(data);
  }else{
    if(!confirm('Unire '+valid.length+' schede? I duplicati sostituiranno le schede presenti.'))return;
    const map=new Map(repos.map(r=>[recordKey(r),r]));
    valid.forEach(r=>map.set(recordKey(r),r));
    const merged=[...map.values()];
    if(merged.length>5000||new TextEncoder().encode(JSON.stringify({...snapshot(),repositories:merged})).length>ARCHIVE_LIMIT)throw new AtlasError('ARCHIVE_TOO_LARGE');
    repos=merged;
  }
  const migrated=mergeBundledSeed();
  save();
  message('Archivio letto dal file.'+(migrated.added?' Aggiunte '+migrated.added+' nuove schede predefinite.':'')+' Salvalo anche su Drive per aggiornare la copia remota.');
});
$('settingsBtn').onclick=()=>{$('provider').value=prefs.provider||'ollama';$('model').value=prefs.model||'';$('googleClient').value=prefs.googleClient||'';$('apiKey').value=session.apiKey;$('githubKey').value=session.githubKey;$('githubOwner').value=githubOwner();$('themeMode').value=prefs.theme||'system';$('settingsFeedback').textContent='';renderConfigStatus();$('settings').showModal()};$('saveSettings').onclick=()=>{if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test($('githubOwner').value.trim())){showError(new AtlasError('GITHUB_OWNER_INVALID'),'settings');return}if(prefs.googleClient!==$('googleClient').value.trim())googleAuth={token:'',expiresAt:0,scopes:[]};prefs={provider:$('provider').value,model:$('model').value.trim(),googleClient:$('googleClient').value.trim(),githubOwner:$('githubOwner').value.trim(),theme:$('themeMode').value};applyTheme(prefs.theme);session.apiKey=$('apiKey').value.trim();session.githubKey=$('githubKey').value.trim();try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch{}formDirty=false;save();if(prefs.googleClient)loadGoogle().catch(e=>showError(e,'google_library'));$('settings').close();message('Configurazione pronta. Modello e Client ID sono inclusi nell’archivio; le chiavi API restano escluse.')};$('forgetKeys').onclick=()=>{session.apiKey='';session.githubKey='';$('apiKey').value='';$('githubKey').value='';googleToken='';googleAuth={token:'',expiresAt:0,scopes:[]};renderConfigStatus();message('Chiavi e token Google dimenticati in questa sessione.')};
async function init(){
  let draft=null, safeToDraft=true;
  try{prefs=JSON.parse(localStorage.getItem(PREF)||'{}')||{}}catch{}
  try{const value=localStorage.getItem(DB);if(value){draft=JSON.parse(value);validateSnapshot(draft)}}catch{draft=null}
  try{const large=await readLargeDraft();if(large&&(!draft||String(large.exportedAt)>String(draft.exportedAt))){validateSnapshot(large);draft=large}}catch{recordDiagnostic('BROWSER_STORAGE',{operation:'emergency_load'})}
  try{
    const seedData=await jsonFetch('./seed.json');
    bundledSeed=validateSnapshot(seedData);
    bundledSeedVersion=Math.max(1,catalogSeedVersion(seedData));
    repos=bundledSeed.map(normalize);
    seedVersionApplied=bundledSeedVersion;
  }catch(e){message('Catalogo iniziale non disponibile: '+e.message+'. Puoi aprire un archivio JSON.')}
  if(draft){try{loadCatalog(draft)}catch{message('Copia browser non valida: apri un file JSON.')}}
  if(safeToDraft){
    const migrated=mergeBundledSeed();
    if(migrated.changed){save();message('Catalogo aggiornato: '+migrated.added+' nuove schede.')}
    emergencyDraft();
  }
  current=repos[0]?.id;
  render();storageStatus();updateCapabilities();
  if(prefs.googleClient)loadGoogle().catch(()=>{});
  if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  const shared=new URLSearchParams(location.search);if(shared.has('title')||shared.has('text')||shared.has('link')){const title=shared.get('title')||'',body=shared.get('text')||'',link=shared.get('link')||(body.match(/https?:\/\/\S+/)||[])[0]||'';history.replaceState(null,'',location.pathname);newEntry('idea');$('entryTitle').value=title||body.slice(0,120)||'Idea condivisa';$('repoUrl').value=link;$('repoDescription').value=body;formDirty=true}
}
function catalogContent(data){return JSON.stringify({repositories:validateSnapshot(data),settings:data.settings||{},seedVersion:catalogSeedVersion(data)})}

$('openArchiveBtn').onclick=openArchive;
$('saveBtn').onclick=()=>run(saveAll);
$('confirmedDownloadBtn').onclick=()=>{fileGeneration=Number($('confirmDownload').dataset.version);lastFile='Download verificato da te';storageStatus();$('confirmDownload').close();message('Download confermato.');if(prefs.googleClient)run(saveDrive)};
window.addEventListener('beforeunload',e=>{if(formDirty||captureDraft||busy||fileGeneration!==generation){e.preventDefault();e.returnValue=''}});
for(const id of ['editor','settings'])$(id).addEventListener('input',()=>{formDirty=true});
$('editor').addEventListener('close',()=>{editorSession++;photosLoading=false;formDirty=false});
$('settings').addEventListener('close',()=>{formDirty=false});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){emergencyDraft()}});
function showView(view){
  $('exportScope').textContent=`Esporterai ${targets().length} schede: ${chosen.size?'selezione attiva':'risultati filtrati'}. Torna al Catalogo per cambiare la selezione.`;
  $('catalogView').hidden=view!=='catalog';$('backupView').hidden=view!=='backup';$('discoverView').hidden=view!=='discover';$('apiView').hidden=view!=='api';if(view==='api')window.apiCatalogo?.mostrata();
  document.body.classList.remove('detail-open');
  const navView=view==='discover'?'catalog':view;document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===navView;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
}
function requestClose(dialog){
  if(dialog.id==='captureDialog'&&busy){$('captureFeedback').textContent='Attendi che l’operazione termini.';return}
  if((['editor','settings'].includes(dialog.id)&&formDirty||dialog.id==='captureDialog'&&(captureDraft||$('captureTitle').value||$('captureSource').value||$('captureAnalysis').value))&&!confirm('Scartare le modifiche non salvate?'))return;
  dialog.close();
}
for(const id of ['editor','settings','captureDialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();requestClose($(id))});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$('navAddBtn').onclick=()=>$('addDialog').showModal();
function updateCapabilities(){
  applyTheme(prefs.theme||'system');
  renderConfigStatus();
  $('exportScope').textContent=`Esporterai ${targets().length} schede: ${chosen.size?'selezione attiva':'risultati filtrati'}. Torna al Catalogo per cambiare la selezione.`;
  for(const id of ['saveBtn','navAddBtn','settingsBtn','openArchiveBtn','importBtn','authorizeGoogleBtn','verifyAiBtn','verifyGithubBtn','verifyGoogleBtn','analyzeCaptureBtn','archiveCaptureBtn','captureFile','githubSearchBtn','moreGithubBtn','loadMineBtn','appUpdateBtn','checkAllUpdatesBtn','discoverBtn','exportLogBtn','errorLogBtn'])$(id).disabled=busy;
  $('modeHelp').textContent='Il catalogo vive nel browser: salva il file completo ogni volta che chiudi. L’analisi IA parte dal browser, con il provider scelto in Impostazioni.';
  $('refreshAll').disabled=busy;$('analyzeAll').disabled=busy;
  document.querySelectorAll('[data-action="refresh"],[data-action="analyze"],[data-action="edit"],[data-action="delete"]').forEach(b=>{b.disabled=busy});
}
function renderConfigStatus(){
  const provider=prefs.provider||'ollama',live=!!googleAuth.token&&googleAuth.expiresAt>Date.now();
  $('configStatus').textContent=[
    'IA: '+(prefs.model?'modello indicato':'modello mancante')+' · '+(provider==='ollama'?'Ollama non richiede una chiave':session.apiKey?'chiave presente (validità da verificare)':'chiave API mancante'),
    'Google: '+(!prefs.googleClient?'Client ID mancante':live?'accesso autorizzato in questa sessione':googleAuth.token?'token scaduto: ricollega Google':'accesso da autorizzare con Collega Google'),
    'GitHub: '+(session.githubKey?'token presente (validità da verificare)':'senza token: accesso pubblico con limiti inferiori')
  ].join('\n');
  $('googleOrigin').textContent=location.origin||'Apri l’app tramite HTTP o HTTPS';
}
async function verifyAiCredential(){
  const provider=$('provider').value||'ollama',apiKey=$('apiKey').value.trim(),model=$('model').value.trim();
  if(provider!=='ollama'&&!apiKey)throw new AtlasError('AI_KEY_MISSING');
  $('settingsFeedback').textContent='Verifica IA in corso…';
  const result=await ia('verify/ai',{provider,apiKey,model});
  if(result.authenticated!==true)throw new AtlasError('RESPONSE_INVALID');
  recordDiagnostic('AI_CREDENTIAL_VERIFIED',{operation:'verify_ai',service:'ai',level:'info'});
  const modelResult=result.modelListed===true?' Il modello indicato compare nel catalogo.':result.modelListed===false?' Il modello indicato non compare nel catalogo: controlla il nome.':' Il modello non è stato verificato.';
  const quota=result.quotaExhausted?' Il limite residuo di questa chiave risulta esaurito.':' Credito e disponibilità per la generazione non sono garantiti da questa verifica.';
  $('settingsFeedback').textContent=(provider==='ollama'?'Ollama risponde; non serve una chiave API.':'Chiave accettata dal servizio selezionato.')+modelResult+quota+' Nessun testo è stato generato. La verifica usa i campi mostrati: salva la configurazione per utilizzarli.';
}
async function verifyGithubCredential(){
  const token=$('githubKey').value.trim();if(!token)throw new AtlasError('GITHUB_TOKEN_MISSING');
  $('settingsFeedback').textContent='Verifica token GitHub in corso…';
  const account=await jsonFetch('https://api.github.com/user',{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token}});
  if(!Number.isInteger(account.id))throw new AtlasError('RESPONSE_INVALID',{service:'github'});
  recordDiagnostic('GITHUB_TOKEN_VERIFIED',{operation:'verify_github',service:'github',level:'info'});
  $('settingsFeedback').textContent='Token GitHub accettato. I dati dell’account non sono salvati nel log. Questo non garantisce l’accesso a ogni repository privato. Salva la configurazione per usare il token inserito.';
}
async function verifyGoogleCredential(){
  if($('googleClient').value.trim()!==prefs.googleClient)throw new AtlasError('DRAFT_UNSAVED');
  checkGoogleConfig();
  if(!googleAuth.token)throw new AtlasError('GOOGLE_TOKEN_MISSING');
  if(googleAuth.expiresAt<=Date.now())throw new AtlasError('GOOGLE_EXPIRED');
  if(!googleAuth.scopes.includes('https://www.googleapis.com/auth/drive.file'))throw new AtlasError('GOOGLE_SCOPE');
  $('settingsFeedback').textContent='Verifica accesso Drive in corso…';
  const result=await jsonFetch('https://www.googleapis.com/drive/v3/files?pageSize=1&fields=kind',{headers:{Authorization:'Bearer '+googleAuth.token}});
  if(result.kind!=='drive#fileList')throw new AtlasError('RESPONSE_INVALID',{service:'google'});
  recordDiagnostic('GOOGLE_TOKEN_VERIFIED',{operation:'verify_google',service:'google',level:'info'});
  $('settingsFeedback').textContent='Accesso Google Drive verificato. Nessun file è stato creato o modificato. Questo controllo non verifica separatamente Google Sheets.';
}
$('verifyAiBtn').onclick=()=>run(verifyAiCredential);
$('verifyGithubBtn').onclick=()=>run(verifyGithubCredential);
$('verifyGoogleBtn').onclick=()=>run(verifyGoogleCredential);
$('errorGuide').innerHTML=Object.entries(ERROR_HELP).map(([code,item])=>'<details><summary>'+escapeHTML(item[0])+'</summary><p>'+escapeHTML(item[1])+'</p><small class="muted">Codice: '+escapeHTML(code)+'</small></details>').join('');
$('authorizeGoogleBtn').onclick=()=>run(async function google_connect(){if(formDirty)throw new AtlasError('DRAFT_UNSAVED');await googleAccess('https://www.googleapis.com/auth/drive.file');$('settingsFeedback').textContent='Accesso Google autorizzato. Non è stato creato alcun backup: ora puoi usare Backup su Drive.'});
$('exportLogBtn').onclick=()=>run(exportDiagnostics);
$('errorLogBtn').onclick=()=>run(exportDiagnostics);
$('errorSettingsBtn').onclick=()=>{const field=$('errorSettingsBtn').dataset.field;if(!$('settings').open)$('settingsBtn').click();$(field)?.focus()};
window.addEventListener('error',e=>{const script=String(e.filename||'').split('/').pop().split('?')[0];showError(new AtlasError('UNKNOWN',{script,line:e.lineno,column:e.colno}),'browser_error')});
window.addEventListener('unhandledrejection',e=>{e.preventDefault();showError(e.reason instanceof AtlasError?e.reason:new AtlasError('UNKNOWN'),'unhandled_promise')});
$('captureFile').onchange=()=>{const file=$('captureFile').files[0];$('captureFile').value='';run(async function capture_import(){await loadCaptureFile(file)})};
$('analyzeCaptureBtn').onclick=()=>run(analyzeCaptureDraft);
$('archiveCaptureBtn').onclick=()=>run(archiveCapture);
$('captureDialog').addEventListener('close',()=>{captureDraft=null;$('capturePreview').removeAttribute('src')});
$('captureDialog').addEventListener('paste',e=>{const item=Array.from(e.clipboardData?.items||[]).find(item=>item.type.startsWith('image/'));if(item){e.preventDefault();run(async function capture_paste(){await loadCaptureFile(item.getAsFile())})}});
$('themeBtn').onclick=()=>{prefs.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch{}save()};
$('githubSearchBtn').onclick=()=>run(async function search_github(){await searchGithub(false)});
$('moreGithubBtn').onclick=()=>run(async function search_more(){await searchGithub(true)});
$('webSearchBtn').onclick=searchWeb;
$('discoveryQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('githubSearchBtn').click()}});
$('discoveryResults').addEventListener('click',e=>{const button=e.target.closest('[data-archive-result]');if(!button)return;const record=discoveryResults[Number(button.dataset.archiveResult)];if(record)newEntry('github',record)});
$('loadMineBtn').onclick=()=>run(loadMyGithub);
$('checkAllUpdatesBtn').onclick=()=>run(async function check_updates(){
  const list=repos.filter(r=>r.kind==='github');if(!list.length)throw new AtlasError('GITHUB_ONLY');
  if(!confirm('Controllare gli aggiornamenti di '+list.length+' repository GitHub archiviati?'))return;
  let changed=0,failed=0;
  for(let i=0;i<list.length;i++){message((i+1)+'/'+list.length+' · Controllo aggiornamenti');try{await github(list[i]);if(list[i].updateState==='changed')changed++}catch(e){failed++;showError(e,'check_updates')}}
  message('Controllati '+(list.length-failed)+'/'+list.length+' repository. Aggiornamenti trovati: '+changed+'.'+(failed?' Errori: '+failed+'. Puoi esportare il log diagnostico.':''));
});
$('appUpdateBtn').onclick=()=>run(checkAppUpdate);
$('reloadAppBtn').onclick=()=>{if(formDirty||fileGeneration!==generation){message('Salva il file completo prima di ricaricare.');return}location.reload()};
recordDiagnostic('APP_START',{operation:'start',service:'app',level:'info'});
init();

