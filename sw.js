const CACHE='repo-atlas-v1.8.1';
const FILES=['./index.html','./app.js','./model.js','./appearance.js','./discovery.js','./captures.js','./browser-draft.js','./version.json','./errors.js','./diagnostics.js','./styles.css','./seed.json','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('repo-atlas-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url),root=new URL('./',self.registration.scope);
  const navigation=e.request.mode==='navigate'&&(u.pathname===root.pathname||u.pathname===new URL('./index.html',root).pathname);
  if(e.request.method!=='GET'||u.origin!==root.origin||(!navigation&&!FILES.some(f=>new URL(f,root).pathname===u.pathname)))return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE),key=navigation?new URL('./index.html',root).href:new URL(u.pathname,root.origin).href;
    try{
      const response=await fetch(e.request);
      if(response.ok){const copy=response.clone();e.waitUntil(cache.put(key,copy).catch(()=>{}))}
      return response;
    }catch{
      return await cache.match(key)||Response.error();
    }
  })());
});

