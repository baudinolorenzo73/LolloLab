// Development check: requires Playwright and Chromium. Run: node tests/ui.cjs
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-test-'));
const server=spawn('python',['-u','-c',`
import importlib.util,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('atlas',Path(sys.argv[1])/'server.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.DATA_DIR=Path(sys.argv[2])
s=m.ThreadingHTTPServer(('127.0.0.1',m.PORT),m.Handler)
print('READY',flush=True)
s.serve_forever()
`,root,temp],{stdio:['ignore','pipe','pipe']});
let browser;
const ready=new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('exit',code=>reject(Error('Test server exited: '+code)));server.stderr.on('data',b=>process.stderr.write(b))});
const checks=[];
function pass(name){checks.push(name);console.log('PASS '+name)}
async function saved(page){await page.waitForFunction(()=>fileGeneration===generation&&!fileError)}
async function editNotes(page,text){await page.locator('[data-action="edit"]').click();await page.locator('#repoNotes').fill(text);await page.locator('#editForm button[type="submit"]').click()}
(async()=>{
  await ready;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(()=>localLoaded&&repos.length>0);
  assert(await page.locator('#bulkActions').isHidden());
  await page.evaluate(()=>batch(github));
  assert.match(await page.locator('#message').innerText(),/Nessun repository selezionato/);
  pass('No collective operation without selection; errors shown');
  await page.locator('#list input[type="checkbox"]').first().check();
  assert(await page.locator('#bulkActions').isVisible());
  await page.locator('#search').fill('unlikely-to-match-any-repo-123');
  assert.equal(await page.evaluate(()=>chosen.size),0);
  assert(await page.locator('#bulkActions').isHidden());
  await page.locator('#search').fill('');
  await page.locator('#statusFilter').selectOption('Da provare');
  assert(await page.evaluate(()=>filtered().every(r=>r.status==='Da provare')));
  await page.locator('#statusFilter').selectOption('');
  pass('Changing filters clears selection; state filter works');
  const first=await page.locator('[data-open]').first().getAttribute('data-open');
  await page.locator('[data-open]').first().click();
  await page.locator('[data-action="edit"]').click();
  await page.locator('#repoDescription').fill('Descrizione personale da conservare');
  await page.locator('#repoNotes').fill('Nota di prova');
  await page.locator('#editForm button[type="submit"]').click();
  await saved(page);
  await page.route('https://api.github.com/repos/**',route=>route.fulfill({json:route.request().url().endsWith('/readme')?{encoding:'base64',content:Buffer.from('README di prova').toString('base64')}:{description:'Descrizione remota',stargazers_count:123,language:'JavaScript',license:{spdx_id:'MIT'},pushed_at:'2026-11-07',archived:false}}));
  await page.locator('[data-action="refresh"]').click();
  await page.waitForFunction(()=>!busy);
  await saved(page);
  assert.equal(await page.evaluate(()=>repos.find(r=>r.id===current).description),'Descrizione personale da conservare');
  assert.equal(await page.evaluate(()=>repos.find(r=>r.id===current).github.description),'Descrizione remota');
  pass('GitHub refresh preserves personal description');
  await page.evaluate(()=>{repos.find(r=>r.id===current).inspectionReport='Rapporto persistente di prova';save()});
  await saved(page);
  await page.reload();await page.waitForFunction(()=>localLoaded);
  await page.evaluate(id=>{current=id;render()},first);
  assert.match(await page.locator('#detail').innerText(),/Ultimo rapporto di controllo/);
  await page.locator('#detail summary').filter({hasText:'Ultimo rapporto'}).click();
  assert.match(await page.locator('#detail').innerText(),/Rapporto persistente di prova/);
  pass('Inspection report survives save and reload');
  await page.locator('[data-view="backup"]').click();
  assert(await page.locator('#catalogView').isHidden());
  await page.locator('#exitBtn').click();
  assert.equal(await page.locator('#finishExitBtn').isEnabled(),true);
  await page.locator('#exitRequireDrive').check();
  assert.equal(await page.locator('#finishExitBtn').isEnabled(),false);
  await page.locator('#exitRequireDrive').uncheck();
  await page.locator('#finishExitBtn').click();
  pass('Exit works with file only; Drive can be explicitly required');
  await page.locator('[data-view="catalog"]').click();
  await page.evaluate(id=>{current=id;render()},first);
  await page.locator('[data-action="delete"]').click();await saved(page);
  const count=await page.evaluate(()=>repos.length);
  await page.reload();await page.waitForFunction(()=>localLoaded);
  assert.equal(await page.evaluate(()=>repos.length),count);
  assert.equal(await page.evaluate(id=>repos.some(r=>r.id===id),first),false);
  pass('Deleted seed repository stays deleted after reload');
  const second=await context.newPage();second.on('dialog',d=>d.accept());
  await second.goto('http://localhost:8765/');await second.waitForFunction(()=>localLoaded);
  await editNotes(page,'Modifica prima finestra');await saved(page);
  await editNotes(second,'Modifica in conflitto');
  await second.waitForFunction(()=>fileError.includes('altra finestra'));
  await second.locator('[data-view="backup"]').click();
  await second.locator('#reloadLocalBtn').click();await second.waitForFunction(()=>!busy&&!fileError);
  await second.locator('[data-view="catalog"]').click();
  const awaitId=await second.evaluate(()=>current);
  await editNotes(second,'Recuperata dopo conflitto');await saved(second);
  assert.equal(JSON.parse(fs.readFileSync(path.join(temp,'catalogo.json'),'utf8')).repositories.find(r=>r.id===awaitId).notes,'Recuperata dopo conflitto');
  pass('Concurrent edit rejected; reload revision restores saving');
  await second.close();
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-open]').first().click();
  assert(await page.locator('#list').isHidden());assert(await page.locator('#detail').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-action="back"]').click();
  assert(await page.locator('#list').isVisible());assert(await page.locator('#detail').isHidden());
  pass('Mobile detail/back navigation; no horizontal overflow');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload();
  await page.waitForFunction(()=>repos.length>0);
  assert.equal(await page.evaluate(()=>repos.length),count);
  assert(await page.locator('#list').isVisible());
  pass('Offline reload restores interface and browser catalog');
  assert.deepEqual(errors,[]);
  console.log('All '+checks.length+' browser checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.kill();fs.rmSync(temp,{recursive:true,force:true})});
