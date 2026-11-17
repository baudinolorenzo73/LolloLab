// Service-worker routing checks. Run: node tests/sw.cjs (Node 18+).
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const handlers={},entries=new Map(),deleted=[],cachedFiles=[];
const scope='https://example.github.io/repo_atlas/';
const cache={async addAll(files){cachedFiles.push(...files)},async put(key,response){entries.set(String(key),response)},async match(key){return entries.get(String(key))?.clone()}};
let online=true,requests=0;
const context={URL,Response,location:{origin:'https://example.github.io'},
  self:{registration:{scope},clients:{async claim(){}},async skipWaiting(){},addEventListener(k,fn){handlers[k]=fn}},
  caches:{async open(){return cache},async keys(){return ['repo-atlas-v1.2.0','unrelated-app-cache']},async delete(key){deleted.push(key)}},
  async fetch(){requests++;if(!online)throw Error('offline');return new Response('network html')}
};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),context);
async function lifecycle(name){let pending;handlers[name]({waitUntil(p){pending=p}});await pending}
async function request(path,mode='navigate'){
  let response;const pending=[];
  handlers.fetch({request:{url:scope+path,method:'GET',mode},respondWith(p){response=p},waitUntil(p){pending.push(p)}});
  const result=await response;await Promise.all(pending);return result;
}
(async()=>{
  await lifecycle('install');assert(cachedFiles.includes('./styles.css'));assert(cachedFiles.includes('./index.html'));
  assert(cachedFiles.includes('./errors.js'));assert(cachedFiles.includes('./diagnostics.js'));
  for(const file of ['model.js','appearance.js','discovery.js','version.json'])assert(cachedFiles.includes('./'+file));
  for(const file of ['captures.js','browser-draft.js'])assert(cachedFiles.includes('./'+file));
  await lifecycle('activate');assert.deepEqual(deleted,['repo-atlas-v1.2.0']);
  assert.equal(await (await request('')).text(),'network html');
  online=false;
  assert.equal(await (await request('index.html')).text(),'network html');
  assert.equal(await (await request('')).text(),'network html');
  const before=requests;assert.equal(await request('api/health','cors'),undefined);assert.equal(requests,before);
  assert.equal(await request('preview/project/index.html'),undefined);
  console.log('PASS PWA shell assets, scoped cache cleanup, root/index offline fallback, API/preview bypass');
})().catch(e=>{console.error(e);process.exitCode=1});
