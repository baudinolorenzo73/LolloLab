'use strict';
const APP_VERSION='1.7.1',DEFAULT_GITHUB_OWNER='baudinolorenzo73';
function webUrl(value,optional=false){
  if(optional&&!String(value||'').trim())return '';
  let url;try{url=new URL(String(value).trim())}catch{throw new AtlasError('WEB_URL_INVALID')}
  if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw new AtlasError('WEB_URL_INVALID');
  return url.href;
}
function githubOwner(){return (prefs.githubOwner||DEFAULT_GITHUB_OWNER).trim()}
function isMine(record){return record.kind==='github'&&record.id.split('/')[0].toLowerCase()===githubOwner().toLowerCase()}
function labelFor(record){return record.title||record.id}
function kindLabel(kind){return {github:'Repository GitHub',web:'Link web',idea:'Idea'}[kind]||'Scheda'}
function recordKey(record){return record.kind==='github'?record.id.toLowerCase():record.kind==='web'?'web:'+record.url:record.id}
function matchesCollection(record){
  const collection=$('collection').value||'review';
  return collection==='all'||(collection==='captures'?!!record.capture:collection==='mine'?isMine(record):collection==='ideas'?record.kind!=='github':!isMine(record));
}
function githubHeaders(){const headers={Accept:'application/vnd.github+json'};if(session.githubKey)headers.Authorization='Bearer '+session.githubKey;return headers}
