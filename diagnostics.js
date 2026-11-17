'use strict';
const LOG_KEY='repo-atlas.diagnostics.v1',LOG_LIMIT=300;
let diagnosticEvents=[];
function safeEvent(event){
  const item={at:typeof event.at==='string'&&/^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+$/.test(event.at)?event.at:new Date().toISOString(),
    level:['error','warning','info'].includes(event.level)?event.level:'info',
    code:typeof event.code==='string'&&/^[A-Z_]{2,50}$/.test(event.code)?event.code:'UNKNOWN',
    operation:typeof event.operation==='string'&&/^[a-z_/-]{1,40}$/.test(event.operation)?event.operation:'app',
    service:['google','github','local','ai','app'].includes(event.service)?event.service:'app'};
  if(Number.isInteger(event.status)&&event.status>=100&&event.status<=599)item.status=event.status;
  if(['app.js','model.js','appearance.js','discovery.js','captures.js','browser-draft.js','errors.js','diagnostics.js','sw.js'].includes(event.script))item.script=event.script;
  for(const key of ['line','column'])if(Number.isInteger(event[key])&&event[key]>=0&&event[key]<1000000)item[key]=event[key];
  return item;
}
try{const saved=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');if(Array.isArray(saved))diagnosticEvents=saved.slice(-LOG_LIMIT).map(safeEvent)}catch{}
function recordDiagnostic(code,meta={}){
  diagnosticEvents.push(safeEvent({at:new Date().toISOString(),level:meta.level||'error',code,operation:meta.operation,service:meta.service,status:meta.status,script:meta.script,line:meta.line,column:meta.column}));
  diagnosticEvents=diagnosticEvents.slice(-LOG_LIMIT);
  try{localStorage.setItem(LOG_KEY,JSON.stringify(diagnosticEvents))}catch{}
}
function diagnosticSnapshot(){
  return {application:'Repo Atlas',version:'1.5.0',exportedAt:new Date().toISOString(),
    environment:{online:navigator.onLine!==false,localAssistant:!!localToken,localArchiveLoaded:localLoaded,
      browserEmergencyCopy:storageOK,pendingFileSave:fileGeneration!==generation,
      provider:['ollama','groq','openrouter','openai'].includes(prefs.provider)?prefs.provider:'unset',
      aiKeyPresent:!!session.apiKey,modelPresent:!!prefs.model,githubTokenPresent:!!session.githubKey,
      googleClientPresent:!!prefs.googleClient,googleAccessActive:!!googleAuth.token&&googleAuth.expiresAt>Date.now()},
    // Only whitelisted event fields. No keys, tokens, notes, README, model names, URLs or raw errors.
    events:diagnosticEvents.map(safeEvent)};
}
async function exportDiagnostics(){
  const log=diagnosticSnapshot();
  if(localToken){try{const result=await local('logs',{});log.serverEvents=Array.isArray(result.events)?result.events.slice(-300).map(safeEvent):[]}catch{log.serverLogUnavailable=true}}
  downloadBlob(JSON.stringify(log,null,2),'application/json','Repo_Atlas_log_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  message('Log diagnostico esportato. Puoi inviarlo insieme a una descrizione del problema. Chiavi, token e contenuto delle schede sono esclusi.');
  if($('settings').open)$('settingsFeedback').textContent='Log diagnostico esportato. Puoi inviarlo per assistenza.';
}
