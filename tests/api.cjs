// Sezione «API gratuite» (fusa nella 1.8.0). Richiede Playwright e Chromium. Run: node tests/api.cjs
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
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    // preferita salvata dalla vecchia app «api» sullo stesso indirizzo: deve ritrovarsi
    await context.addInitScript(()=>{if(!localStorage.getItem('pubblica.api.pref'))localStorage.setItem('pubblica.api.pref',JSON.stringify(['Animals|Axolotl|https://theaxolotlapi.netlify.app/']))});
    await context.route(/^https:\/\/(raw\.githubusercontent\.com|api\.github\.com)\//,r=>r.fulfill({status:503,body:''}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${port}/index.html`);await page.waitForFunction(()=>typeof repos!=='undefined');
    await page.click('[data-view="api"]');
    assert(await page.locator('#apiView').isVisible());assert(await page.locator('#catalogView').isHidden());
    assert.equal(await page.getAttribute('[data-view="api"]','aria-pressed'),'true');
    assert.match(await page.textContent('#api-conta'),/API trovate/);assert((await page.locator('#api-trek-lista .api-voce').count())>5);
    pass('Menu API gratuite: elenco e riepilogo trekking visibili');
    await page.fill('#api-q','meteo');await page.waitForTimeout(150);
    const trovate=Number((await page.textContent('#api-conta')).split(' ')[0]);assert(trovate>0&&trovate<100);
    await page.fill('#api-q','');for(const f of ['#api-senza','#api-cors','#api-https'])await page.uncheck(f);await page.check('#api-pref');await page.waitForTimeout(150);
    assert.match(await page.textContent('#api-conta'),/^1 API trovata/);assert(await page.locator('#api-lista .api-az button.on').count()===1);
    await page.uncheck('#api-pref');
    pass('Ricerca e preferite della vecchia app ritrovate');
    const nome=await page.locator('#api-lista .api-voce .api-nome a').first().textContent(),url=await page.locator('#api-lista .api-voce .api-nome a').first().getAttribute('href');
    await page.locator('#api-lista .api-voce button[title="Archivia in LolloLab"]').first().click();
    assert(await page.locator('#editor').isVisible());
    assert.equal(await page.inputValue('#entryTitle'),nome);assert.equal(await page.inputValue('#repoUrl'),url);
    assert.equal(await page.inputValue('#entryKind'),'web');assert.equal(await page.inputValue('#repoCategory'),'API e dati');
    assert.match(await page.inputValue('#repoNotes'),/Da «API gratuite» di LolloLab/);
    await page.click('#saveEntryBtn');await page.waitForFunction(u=>repos.some(r=>r.url===u),url);
    const scheda=await page.evaluate(u=>{const r=repos.find(x=>x.url===u);return {kind:r.kind,category:r.category,status:r.status,tags:r.tags}},url);
    assert.equal(scheda.kind,'web');assert.equal(scheda.category,'API e dati');assert.equal(scheda.status,'Da controllare');assert.match(String(scheda.tags),/API/);
    pass('📌 Archivia: editor compilato e scheda salvata nell’archivio');
    await page.click('[data-view="api"]');
    await page.locator('#api-trek-lista button[title="Archivia in LolloLab"]').first().click();
    assert.equal(await page.inputValue('#repoCategory'),'GPX e trekking');
    await page.locator('#editor [data-close]').click();await page.waitForTimeout(100);
    if(await page.locator('#editor').isVisible())await page.keyboard.press('Escape');
    await page.click('#sc-ai');assert(await page.locator('#v-ai').isVisible());assert(await page.locator('#v-api').isHidden());
    assert.match(await page.textContent('#ai-conta'),/provider mostrati/);
    await page.locator('#ai-lista button[title="Archivia in LolloLab"]').first().click();
    assert.equal(await page.inputValue('#repoCategory'),'IA');assert.match(await page.inputValue('#entryTitle'),/IA gratuita/);
    await page.locator('#editor [data-close]').click();await page.waitForTimeout(100);
    pass('Trekking e API IA: archiviazione con la categoria giusta');
    await page.reload();await page.waitForFunction(()=>typeof repos!=='undefined');await page.click('[data-view="api"]');
    assert(await page.locator('#v-ai').isVisible());
    pass('Ricorda l’ultima scheda aperta');
    await page.evaluate(()=>applyTheme('dark'));
    assert.equal(await page.locator('#ai-lista .ai-scheda').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(36, 59, 50)');
    await page.setViewportSize({width:390,height:844});await page.click('#sc-api');await page.waitForTimeout(150);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    pass('Tema scuro di LolloLab e nessuno scorrimento orizzontale su telefono');
    assert.deepEqual(errors,[]);pass('Nessun errore JavaScript');
    console.log(`All ${checks} API checks passed.`);
  }catch(e){console.error(e);process.exitCode=1}
  finally{if(browser)await browser.close();server.kill()}
})();
