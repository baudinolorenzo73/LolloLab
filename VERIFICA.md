# Verifica

## Controlli 1.10.0 (ristrutturazione)
- node tests/app.cjs, sw.cjs, api.cjs, ia.cjs e menu.cjs superati.
- menu.cjs: 3 voci + «+ Aggiungi», idea/link/foto, Cerca dentro Archivio, Impostazioni dal backup, esportazioni JSON/Excel/PDF, 💾 Salva (solo file senza Google; file + Drive con Google, con Drive simulato), nessuno scorrimento orizzontale a 390 px.
- Non verificato con un account reale: il backup Drive dal nuovo pulsante Salva.

## Controlli 1.9.0 (assistente PC rimosso)
- node tests/app.cjs, tests/sw.cjs, tests/api.cjs e tests/ia.cjs superati.
- IA dal browser provata con provider simulato (Groq): intestazione Authorization, corpo della richiesta, immagine, errori mappati; nessuna chiamata a ./api/ né a localhost:8765.
- Salvataggio manuale: download JSON, conferma, stato «Da salvare su file» a ogni modifica, avviso di beforeunload in Chromium.
- Non verificato con servizi reali: Groq/OpenRouter/OpenAI/Ollama con chiavi vere (CORS e OLLAMA_ORIGINS da provare), Drive/OAuth, chiusura forzata su Android.
- Rimossi i test Python e tests/ui.cjs, che dipendevano da server.py.

## Nuovi controlli 1.8.0 (API gratuite fuse in LolloLab)

- Menu «API gratuite»: riepilogo trekking, elenco public-apis con ricerca e filtri, schede API pubbliche / API IA, ultima scheda ricordata.
- Preferite salvate dalla vecchia app «api» (chiavi pubblica.api.* e pubblica.ai.*) ritrovate.
- «📌 Archivia» da API pubblica, trekking e provider IA: editor compilato, categoria corretta, scheda salvata nell'archivio.
- Tema scuro di LolloLab applicato alla sezione; nessuno scorrimento orizzontale a 390 px; nessun errore JavaScript.
- api-catalogo.js nella cache del service worker e tra i file serviti dall'assistente PC (server.py).
- Comando: node tests/api.cjs (Playwright).

## Nuovi controlli 1.5.0

- 35 controlli JavaScript comportamentali superati; aggiunti importazione ScreenAI, conservazione dell’immagine e analisi originale, modifica separata del testo, archiviazione senza IA, rifiuto formati/URL non ammessi, richiesta vision e copia IndexedDB simulata di 3 MB.
- 12 test Python superati; aggiunti roundtrip delle catture con filtro dei campi, rifiuto fonti non ammesse e payload vision senza credenziali nel risultato.
- Le validazioni immagine controllano MIME, base64, dimensione e firma PNG/JPEG/WebP. Non sono una verifica forense completa della struttura del file.
- Il contratto JSON esportato da ScreenAI è stato verificato lato importatore; sono stati aggiunti test C# lato esportatore ma non eseguiti: dotnet non è disponibile nell’ambiente. Non è stato prodotto né provato un nuovo EXE Windows.
- Nessuna schermata personale usata nei test; solo fixture sintetiche. Nessuna chiamata con credenziali reali e nessuna analisi vision reale dichiarata.
- Service worker aggiornato con captures.js e browser-draft.js. Restano da verificare screenshot da appunti nei vari browser, download dei file, persistenza effettiva IndexedDB, compilazione Windows e layout sul dispositivo.

Riferimenti delle richieste vision: https://docs.ollama.com/api/openai-compatibility ; https://console.groq.com/docs/vision

## Nuovi controlli 1.4.0

- 30 controlli JavaScript comportamentali superati, inclusi quelli precedenti e i flussi idee, link, ricerca, archiviazione, appartenenza all’account, importazione, aggiornamenti, temi e backup.
- Nove test Python superati: inclusi roundtrip schema 2 con idee/link e impostazioni, compatibilità schema 1 e rifiuto di URL pericolosi o con credenziali.
- Logica service worker verificata con cache simulata, nuovi file precache e percorsi relativi. Nessuna eliminazione dei dati applicativi.
- Contrasto calcolato per il tema scuro: testo principale/superficie 12,42:1; testo secondario/superficie 7,39:1; accento/testo pulsante 9,76:1. Questo controllo non sostituisce una verifica visiva del layout.
- Ricerca GitHub e importazione simulate: query codificata, risultati archiviabili, duplicati segnalati, solo repository del proprietario configurato e note esistenti conservate.
- Controllo aggiornamenti simulato: primo controllo, commit cambiato, collegamento al confronto e controllo successivo invariato. Aggiornamento app bloccato finché manca salvataggio.
- Nessuna chiamata con credenziali reali. Ricerca web apre una nuova scheda del motore scelto; non è una ricerca web incorporata nell’app.
- Restano da verificare resa grafica su dispositivo, popup, installazione PWA e account reali. La suite Playwright rimane non dichiarata superata per la restrizione Chromium già documentata.

Riferimenti per le API: https://docs.github.com/en/rest/search ; https://docs.github.com/en/rest/repos/repos

## Nuovi controlli 1.3.1

- 21 controlli JavaScript comportamentali superati, compresi quelli della versione precedente.
- Sette test Python superati: aggiunti classificazione dell’errore remoto senza inoltrare chiavi, metadati dei log server e verifiche IA in sola lettura.
- Verificati: mancanza chiave/modello, Ollama senza chiave, formato Client ID, popup e consenso Google, token assente, permessi insufficienti, errori di rete e codici dei servizi.
- Test con stringhe segnaposto di chiavi, token, note e README: nessuna è presente nel log diagnostico esportabile. Verificato limite di 300 eventi del browser.
- Test service worker e controllo sintattico superati; shell aggiornata con errors.js e diagnostics.js.
- OAuth reale, portali dei provider, scaricamento del log nei browser mobili e resa visiva restano da collaudare sul dispositivo. La suite browser non è stata dichiarata superata: resta la restrizione Chromium dell’ambiente riportata sotto.
- Le chiamate remote sono simulate; nessuna chiave o credenziale reale è stata usata.
- I tre pulsanti di verifica IA, GitHub e Google usano richieste in sola lettura. Verificati in simulazione URL/metodo, token solo nelle intestazioni e assenza delle credenziali dai risultati e dai log. Restano da provare con gli account reali.

Fonti per l’implementazione: https://developers.google.com/identity/oauth2/web/guides/use-token-model ; https://developers.google.com/identity/oauth2/web/guides/error ; https://developers.openai.com/api/docs/guides/error-codes

## Controlli conservati dalla versione 1.3.0

Data: 7 novembre 2026. Base: main, commit 717885ff5ac7002c39e9579d8e4d7406aada2f01.

## Verificato automaticamente

- Tre test Python: salvataggio/rilettura con seedVersion, descrizioni e rapporti; esclusione delle chiavi; storico, rifiuto dei conflitti e salvataggio dopo rilettura della revisione; compatibilità dei vecchi cataloghi.
- Dodici controlli JavaScript con DOM simulato: selezione esplicita, filtri, azioni collettive, conservazione delle descrizioni, rapporti con escaping, cancellazioni rispettate, backup completo senza segreti, uscita con Drive facoltativo, navigazione, conferma di abbandono delle modifiche, recupero dei conflitti, confronto delle impostazioni nel recupero, migrazione da file senza seedVersion e ripristino browser senza rete. Alcuni controlli coprono più comportamenti correlati.
- Service worker con cache simulata: interfaccia e CSS precache, pulizia limitata alle cache Repo Atlas, fallback offline di directory e index.html, esclusione di API locali e anteprime.
- Sintassi JavaScript/Python e controllo del pacchetto PWA.

## Da provare nel browser e sul dispositivo

- La suite Playwright tests/ui.cjs è inclusa, ma non è stata eseguita fino in fondo: Chromium non può avviarsi in questo ambiente per una restrizione sui socket locali. Non è quindi dichiarata superata.
- Resa visiva desktop/telefono, installazione e aggiornamento della PWA su Android/iPhone, riavvio realmente offline e selettore/download di file.
- Google OAuth, caricamento Drive/Sheets e chiamate a modelli reali richiedono account e credenziali. Sono conservati ma non collaudati con credenziali reali.
- Il controllo ZIP e l’anteprima isolata mantengono il comportamento precedente; non è stato scaricato o eseguito alcun repository esterno durante questi test.

## Compatibilità e distribuzione

- JSON schema 1, stessi nomi LocalStorage, stessi percorsi data/catalogo.json e data/storico.
- Nessun archivio personale incluso nello ZIP. Conservare data e downloads durante l’aggiornamento.
- In assenza di una copia browser confrontabile, un vecchio file senza seedVersion viene integrato una volta; da quel momento le cancellazioni sono conservate.
- Pacchetto completo per Pubblica/GitHub Pages. Non è stato pubblicato né modificato il repository remoto.

Comandi: node tests/app.cjs; node tests/sw.cjs; node tests/api.cjs; node tests/ia.cjs.
