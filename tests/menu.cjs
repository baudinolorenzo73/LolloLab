// Struttura semplificata (1.10.0): menu, + Aggiungi, Salva unico. Run: node tests/menu.cjs
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),port=8000+Math.floor(Math.random()*900);
let checks=0;const pass=n=>{checks++;console.log('PASS '+n)};
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
(async()=>{
  let browser;
  try{
    await new Promise(r=>setTimeout(r,800));
    browser=await chromium.launch();
    const context=await browser.newContext({viewport:{width:1000,height:900}});
    await context.route(/^https:\/\/(raw\.githubusercontent\.com|api\.github\.com)\//,r=>r.fulfill({status:503,body:''}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${port}/index.html`);await page.waitForFunction(()=>typeof repos!=='undefined'&&repos.length>0);

    const nav=await page.locator('.app-nav button').allTextContents();
    assert.deepEqual(nav,['Archivio','API gratuite','Impostazioni e backup','+ Aggiungi']);
    for(const id of ['addBtn','quickCameraBtn','quickGalleryBtn','newIdeaBtn','newWebBtn','captureBtn','navSettingsBtn','exitBtn','exitDialog','saveFileBtn','saveDriveBtn','csvBtn','sheetsBtn','settingsLogBtn','checkConfigBtn'])
      assert.equal(await page.locator('#'+id).count(),0,'doppione ancora presente: '+id);
    assert.equal(await page.locator('#saveBtn').count(),1);assert.equal(await page.locator('#settingsBtn').count(),1);
    pass('Menu a 3 voci più «+ Aggiungi»; pulsanti doppi e nulli spariti');

    await page.click('#navAddBtn');assert(await page.locator('#addDialog').isVisible());
    assert.equal(await page.locator('#addDialog .add-choices button').count(),3);
    await page.click('#addIdeaBtn');assert(await page.locator('#editor').isVisible());assert.equal(await page.inputValue('#entryKind'),'idea');
    await page.locator('#editor [data-close]').click();
    await page.click('#navAddBtn');await page.click('#addWebBtn');assert.equal(await page.inputValue('#entryKind'),'web');
    await page.locator('#editor [data-close]').click();
    await page.click('#navAddBtn');await page.click('#addPhotoBtn');assert(await page.locator('#captureDialog').isVisible());
    await page.locator('#captureDialog [data-close]').click();
    pass('«+ Aggiungi»: idea, link web e foto/screenshot da un solo punto');

    await page.click('#discoverBtn');
    assert(await page.locator('#discoverView').isVisible());assert(await page.locator('#catalogView').isHidden());
    assert.equal(await page.getAttribute('[data-view="catalog"]','aria-pressed'),'true');
    await page.click('#discoverBackBtn');assert(await page.locator('#catalogView').isVisible());
    pass('Cerca nuove idee vive dentro Archivio e torna indietro');

    await page.click('[data-view="backup"]');
    assert.equal(await page.locator('#backupView .actions button').allTextContents().then(a=>a.filter(x=>/JSON schede|Excel|PDF|CSV|Sheets/.test(x)).length),3);
    await page.click('#settingsBtn');assert(await page.locator('#settings').isVisible());
    assert.equal(await page.locator('#settings button:has-text("Esporta log")').count(),0);
    await page.locator('#settings [data-close]').click();
    pass('Impostazioni e backup in un solo posto; esportazioni JSON, Excel, PDF');

    // un solo Salva: senza Google scrive solo il file; con Google collegato scrive file + Drive
    const prova=await page.evaluate(async()=>{
      let drive=0;saveDrive=async()=>{drive++};
      window.showSaveFilePicker=async()=>({name:'x.json',createWritable:async()=>({write:async()=>{},close:async()=>{}})});
      prefs.googleClient='';save();await saveAll();const senza={file:fileGeneration===generation,drive};
      prefs.googleClient='abc.apps.googleusercontent.com';save();await saveAll();
      return {senza,con:{file:fileGeneration===generation,drive}};
    });
    assert.deepEqual(prova,{senza:{file:true,drive:0},con:{file:true,drive:1}});
    pass('💾 Salva: solo file senza Google, file + Drive con Google collegato');

    // Aggiorna GitHub: 1 richiesta per repository se nulla è cambiato; si ferma al limite di richieste
    let modo='ok';const richieste=[];
    await context.route(/^https:\/\/api\.github\.com\/repos\//,r=>{richieste.push(r.request().url());
      const cors={'access-control-allow-origin':'*'};
      if(modo==='limite')return r.fulfill({status:429,headers:cors,contentType:'application/json',body:'{"message":"rate limit"}'});
      return r.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(/\/repos\/[^/]+\/[^/]+$/.test(r.request().url())?{pushed_at:'T1',stargazers_count:1}:{})})});
    await page.click('[data-view="catalog"]');
    const nGithub=await page.evaluate(()=>{const l=repos.filter(r=>r.kind==='github');l.forEach(r=>{r.github={...(r.github||{}),pushed:'T1'}});return l.length});
    await page.click('#checkAllUpdatesBtn');await page.waitForFunction(()=>/Controllati/.test(document.getElementById('message').textContent));
    assert.equal(richieste.length,nGithub);assert(richieste.every(u=>/\/repos\/[^/]+\/[^/]+$/.test(u)));
    pass('Aggiorna GitHub: una sola richiesta per repository se nulla è cambiato (niente limite di 60 all’ora)');
    modo='limite';richieste.length=0;
    await page.click('#checkAllUpdatesBtn');await page.waitForFunction(()=>/Limite richieste GitHub/.test(document.getElementById('message').textContent));
    assert.equal(richieste.length,1);assert(await page.locator('#errorActions').isVisible());
    pass('Limite di GitHub: il controllo si ferma subito e spiega il motivo');

    await page.setViewportSize({width:390,height:844});
    for(const v of ['catalog','api','backup'])await page.click(`[data-view="${v}"]`).then(()=>page.waitForTimeout(100)).then(async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'scorrimento orizzontale in '+v));
    pass('Telefono: nessuno scorrimento orizzontale nelle tre sezioni');
    // autoriparazione: index.html vecchio in cache + file nuovi
    const ctx2=await browser.newContext({viewport:{width:390,height:844}});
    const fs=require('fs');const stale=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<meta name="app-version" content="1.10.1">','<meta name="app-version" content="1.10.0">');
    let serviti=0;
    await ctx2.route(/^https:\/\/(raw\.githubusercontent\.com|api\.github\.com)\//,r=>r.fulfill({status:503,body:'{}'}));
    await ctx2.route(`http://127.0.0.1:${port}/index.html`,r=>{serviti++;return r.fulfill({status:200,contentType:'text/html',body:stale})});
    const p2=await ctx2.newPage();const err2=[];p2.on('pageerror',e=>err2.push(e.message));
    await p2.goto(`http://127.0.0.1:${port}/index.html`);
    await p2.waitForFunction(()=>location.search.includes('_r=')&&typeof repos!=='undefined'&&repos.length>0,null,{timeout:15000});
    assert.equal(await p2.getAttribute('meta[name="app-version"]','content'),'1.10.1');
    await p2.click('[data-view="backup"]');await p2.click('#settingsBtn');assert(await p2.locator('#settings').isVisible());
    assert.deepEqual(await p2.locator('.app-nav button').allTextContents(),['Archivio','API gratuite','Impostazioni e backup','+ Aggiungi']);
    pass('index.html vecchio in cache: la pagina se ne accorge, svuota la cache dell’app e si ricarica da sola');
    assert.deepEqual(errors,[]);pass('Nessun errore JavaScript');
    console.log(`All ${checks} menu checks passed.`);
  }catch(e){console.error(e);process.exitCode=1}
  finally{if(browser)await browser.close();server.kill()}
})();
