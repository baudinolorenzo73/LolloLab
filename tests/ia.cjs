// IA dal browser e salvataggio manuale (nessun server locale). Run: node tests/ia.cjs
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),port=8000+Math.floor(Math.random()*900);
let checks=0;const pass=n=>{checks++;console.log('PASS '+n)};
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
(async()=>{
  let browser;
  try{
    await new Promise(r=>setTimeout(r,800));
    browser=await chromium.launch();
    const context=await browser.newContext({viewport:{width:1000,height:900},acceptDownloads:true});
    const chiamate=[];
    await context.route(/^https:\/\/(raw\.githubusercontent\.com|api\.github\.com)\//,r=>r.fulfill({status:503,body:''}));
    await context.route('https://api.groq.com/**',async r=>{
      const req=r.request(),url=req.url();chiamate.push({url,auth:req.headers().authorization,body:req.postData()});
      const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
      if(req.method()==='OPTIONS')return r.fulfill({status:204,headers:cors});
      if(url.endsWith('/models'))return r.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({data:[{id:'llama-test'}]})});
      if(chiamate.filter(c=>c.url.endsWith('/chat/completions')).length===3)return r.fulfill({status:401,headers:cors,contentType:'application/json',body:JSON.stringify({error:{message:'invalid key'}})});
      return r.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:'Analisi di prova dal provider'}}]})});
    });
    const locale=[];context.on('request',q=>{if(q.url().startsWith(`http://127.0.0.1:${port}/api/`)||q.url().includes('127.0.0.1:8765/api/'))locale.push(q.url())});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.type()==='beforeunload'?null:d.accept());
    await page.goto(`http://127.0.0.1:${port}/index.html`);await page.waitForFunction(()=>typeof repos!=='undefined'&&repos.length>0);
    assert.match(await page.textContent('#connection'),/Da salvare su file/);
    assert.equal(await page.locator('#reloadLocalBtn').count(),0);
    pass('Nessun assistente PC: stato «Da salvare su file», pulsante di ricarica locale sparito');

    await page.evaluate(()=>{prefs.provider='groq';prefs.model='llama-test';session.apiKey='CHIAVE_PROVA';repos.push(normalize({id:'idea:provaprova1',kind:'idea',title:'Idea di prova',description:'Una descrizione'}));current='idea:provaprova1';render()});
    await page.evaluate(()=>{document.getElementById('detail').innerHTML='';renderDetail()});
    await page.click('#detail [data-action="analyze"]');
    await page.waitForFunction(()=>repos.find(r=>r.id==='idea:provaprova1').analysis.includes('provider'));
    const c1=chiamate.find(c=>c.url.endsWith('/chat/completions'));
    assert.equal(c1.url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(c1.auth,'Bearer CHIAVE_PROVA');
    const b1=JSON.parse(c1.body);assert.equal(b1.model,'llama-test');assert.equal(b1.messages[0].role,'system');assert.match(b1.messages[1].content,/Idea di prova/);
    pass('Analisi di una scheda: richiesta diretta al provider con la chiave in sessione');

    await page.evaluate(()=>{document.getElementById('settingsBtn').click()});
    await page.fill('#provider','groq').catch(()=>{});await page.selectOption('#provider','groq');await page.fill('#apiKey','CHIAVE_PROVA');await page.fill('#model','llama-test');
    await page.click('#verifyAiBtn');await page.waitForFunction(()=>/compare nel catalogo/.test(document.getElementById('settingsFeedback').textContent));
    assert(chiamate.some(c=>c.url==='https://api.groq.com/openai/v1/models'&&c.auth==='Bearer CHIAVE_PROVA'));
    await page.evaluate(()=>document.getElementById('settings').close());
    pass('Verifica chiave: elenco modelli letto dal browser, nessun testo generato');

    await page.evaluate(png=>{setCaptureDraft({capture:normalizeCapture({imageDataUrl:png,capturedAt:new Date().toISOString(),origin:'Screenshot'}),title:'Foto',source:'',analysis:''})},PNG);
    await page.evaluate(()=>analyzeCaptureDraft());
    const c2=chiamate.filter(c=>c.url.endsWith('/chat/completions')).pop();
    assert(JSON.parse(c2.body).messages[1].content.some(p=>p.type==='image_url'&&p.image_url.url.startsWith('data:image/png')));
    assert.match(await page.inputValue('#captureAnalysis'),/provider/);
    pass('Analisi di uno screenshot: immagine inviata dal browser');

    await page.evaluate(()=>{prefs.provider='groq'});
    const errore=await page.evaluate(async()=>{try{await analyze(repos.find(r=>r.id==='idea:provaprova1'));return ''}catch(e){return e.code+'|'+e.message}});
    assert(errore.startsWith('AI_AUTH|'));assert(!errore.includes('CHIAVE_PROVA'));
    pass('Chiave rifiutata: errore chiaro, la chiave non compare nel messaggio');
    assert.deepEqual(locale,[]);

    await page.evaluate(()=>{window.showSaveFilePicker=undefined;captureDraft=null;formDirty=false});
    const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#saveBtn')]);
    assert.equal(dl.suggestedFilename(),'Repo_Atlas_catalogo.json');
    const contenuto=JSON.parse(require('fs').readFileSync(await dl.path(),'utf8'));assert(contenuto.repositories.some(r=>r.id==='idea:provaprova1'));
    await page.waitForSelector('#confirmDownload[open]');
    await page.click('#confirmedDownloadBtn');
    assert.match(await page.textContent('#connection'),/● Salvato su file/);
    await page.evaluate(()=>{repos.push(normalize({id:'idea:secondaaa1',kind:'idea',title:'Altra'}));save()});
    assert.match(await page.textContent('#connection'),/Da salvare su file/);
    pass('Salvataggio manuale: download JSON, conferma, e ogni modifica chiede di nuovo il salvataggio');

    await page.click('body');
    const dialoghi=[];page.on('dialog',d=>{if(d.type()==='beforeunload'){dialoghi.push(d.type());d.dismiss()}});
    await page.close({runBeforeUnload:true});
    await new Promise(r=>setTimeout(r,300));
    assert.equal(dialoghi.length,1);
    pass('Chiusura con modifiche non salvate: il browser chiede conferma');
    assert.deepEqual(errors,[]);pass('Nessun errore JavaScript');
    console.log(`All ${checks} IA/save checks passed.`);
  }catch(e){console.error(e);process.exitCode=1}
  finally{if(browser)await browser.close();server.kill()}
})();
