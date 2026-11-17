'use strict';
let discoveryResults=[],discoveryPage=1,discoveryQuery='';
function renderDiscovery(){
  $('discoveryResults').innerHTML=discoveryResults.map((r,i)=>{
    const exists=repos.some(x=>recordKey(x)===recordKey(r));
    return '<article class="search-result"><div><h3><a href="'+escapeHTML(r.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHTML(r.id)+'</a></h3><p>'+escapeHTML(r.description||'Nessuna descrizione disponibile.')+'</p><small class="muted">★ '+(r.github?.stars||0)+' · '+escapeHTML(r.github?.language||'linguaggio non indicato')+'</small></div><button data-archive-result="'+i+'" '+(exists?'disabled':'')+'>'+ (exists?'Già archiviato':'Archivia da controllare')+'</button></article>';
  }).join('');
}
async function searchGithub(next=false){
  const query=$('discoveryQuery').value.trim();if(!query)throw new AtlasError('SEARCH_EMPTY');
  if(!next||query!==discoveryQuery){discoveryPage=1;discoveryResults=[];discoveryQuery=query;renderDiscovery()}
  const data=await jsonFetch('https://api.github.com/search/repositories?q='+encodeURIComponent(query)+'&sort=updated&order=desc&per_page=20&page='+discoveryPage,{headers:githubHeaders()});
  if(!Array.isArray(data.items))throw new AtlasError('RESPONSE_INVALID',{service:'github'});
  const added=data.items.map(meta=>recordFromGithub(meta));
  const seen=new Set(discoveryResults.map(r=>r.id.toLowerCase()));
  discoveryResults.push(...added.filter(r=>!seen.has(r.id.toLowerCase())));
  $('discoveryStatus').textContent=discoveryResults.length+' risultati mostrati su '+(data.total_count||0)+(data.incomplete_results?' · Ricerca parziale: prova termini più specifici.':'');
  $('moreGithubBtn').hidden=added.length<20||discoveryPage>=50;
  discoveryPage++;renderDiscovery();
  if(!discoveryResults.length)$('discoveryStatus').textContent='Nessun repository trovato. Prova altre parole chiave.';
}
function recordFromGithub(meta){
  return normalize({id:meta.full_name,kind:'github',title:meta.full_name,description:meta.description||'',
    status:'Da controllare',github:{stars:meta.stargazers_count||0,language:meta.language||'',license:meta.license?.spdx_id||'',pushed:meta.pushed_at||'',archived:!!meta.archived},checkedAt:new Date().toISOString()});
}
function searchWeb(){
  const query=$('discoveryQuery').value.trim();if(!query){showError(new AtlasError('SEARCH_EMPTY'),'search_web');return}
  const engine=$('webEngine').value==='google'?'https://www.google.com/search?q=':'https://duckduckgo.com/?q=';
  const anchor=document.createElement('a');anchor.href=engine+encodeURIComponent(query);anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.click();
  $('discoveryStatus').textContent='Ricerca web aperta in una nuova scheda. Copia il link utile e usa Aggiungi → Link web per archiviarlo.';
}
async function loadMyGithub(){
  const owner=githubOwner();if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(owner))throw new AtlasError('GITHUB_OWNER_INVALID');
  const incoming=[];let page=1;
  for(;page<=50;page++){
    const data=await jsonFetch('https://api.github.com/users/'+encodeURIComponent(owner)+'/repos?type=owner&per_page=100&page='+page,{headers:githubHeaders()});
    if(!Array.isArray(data))throw new AtlasError('RESPONSE_INVALID',{service:'github'});
    incoming.push(...data.filter(m=>m.owner?.login?.toLowerCase()===owner.toLowerCase()).map(recordFromGithub));
    if(data.length<100)break;
  }
  const keys=new Set(repos.map(recordKey)),newRecords=incoming.filter(r=>!keys.has(recordKey(r)));
  if(repos.length+newRecords.length>5000)throw new AtlasError('ARCHIVE_TOO_LARGE');
  repos.push(...newRecords);$('collection').value='mine';chosen.clear();showView('catalog');save();
  message('Aggiunti '+newRecords.length+' repository pubblici dell’account '+owner+'. Le schede già presenti sono conservate.'+(page>50?' Raggiunto il limite di 5000 risultati.':''));
}
async function checkAppUpdate(){
  if(navigator.onLine===false)throw new AtlasError('NETWORK');
  const info=await jsonFetch('./version.json?check='+Date.now(),{cache:'no-store'});
  if(typeof info.version!=='string')throw new AtlasError('RESPONSE_INVALID');
  if(info.version===APP_VERSION){message('Repo Atlas '+APP_VERSION+': versione pubblicata già aggiornata.');return}
  if(fileGeneration!==generation||formDirty){message('È disponibile Repo Atlas '+info.version+'. Salva prima il file completo, poi premi nuovamente Aggiorna app.');return}
  if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration('./');if(registration)await registration.update()}
  message('Disponibile Repo Atlas '+info.version+'. Premi Ricarica app per caricare la versione pubblicata.');$('reloadAppBtn').hidden=false;
}
