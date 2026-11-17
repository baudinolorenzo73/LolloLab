'use strict';
let draftQueue=Promise.resolve(),draftDatabase=null;
function openDraftDatabase(){
  if(!('indexedDB' in globalThis))return Promise.resolve(null);
  if(!draftDatabase)draftDatabase=new Promise((resolve,reject)=>{
    const request=indexedDB.open('repo-atlas.emergency.v1',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('drafts'))request.result.createObjectStore('drafts')};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>{draftDatabase=null;reject(new AtlasError('BROWSER_STORAGE'))};
    request.onblocked=()=>{draftDatabase=null;reject(new AtlasError('BROWSER_STORAGE'))};
  });
  return draftDatabase;
}
async function readLargeDraft(){
  const db=await openDraftDatabase();if(!db)return null;
  return new Promise((resolve,reject)=>{const request=db.transaction('drafts','readonly').objectStore('drafts').get('current');request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(new AtlasError('BROWSER_STORAGE'))});
}
function queueLargeDraft(data){
  draftQueue=draftQueue.catch(()=>{}).then(async()=>{
    const db=await openDraftDatabase();if(!db)return false;
    return new Promise((resolve,reject)=>{const transaction=db.transaction('drafts','readwrite');transaction.objectStore('drafts').put(data,'current');transaction.oncomplete=()=>resolve(true);transaction.onerror=()=>reject(new AtlasError('BROWSER_STORAGE'));transaction.onabort=()=>reject(new AtlasError('BROWSER_STORAGE'))});
  });return draftQueue;
}
