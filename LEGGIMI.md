# Repo Atlas 1.5.0 — integrazione ScreenAI

## Nuovo flusso: cattura, archivia, valuta più tardi

1. Premi **Screenshot / ScreenAI**.
2. Carica un PNG/JPEG/WebP, incolla un’immagine con Ctrl+V nella finestra (PC) oppure importa un .screenai.json.
3. Puoi usare **Analizza immagine con IA**, aggiungere un appunto o saltare l’analisi.
4. Premi **Archivia da valutare**. La scheda finisce in **Schermate da valutare**, con stato Da controllare.
5. Quando vuoi riprenderla, apri la scheda: l’immagine e l’analisi iniziale sono conservate. Aggiungi cosa vuoi riutilizzare, per quale progetto, tag e note; cambia stato quando hai deciso.

Il flusso è disponibile anche per schermate non relative a GitHub. I link delle fonti vanno confermati: non vengono inventati o aperti automaticamente dall’IA. L’analisi integrata parte dal browser e usa il provider scelto in Impostazioni (serve un modello con immagini).

### Collegamento con ScreenAI 1.8 per Windows

ScreenAI per Windows è un programma separato: dalla versione 1.8.0 di LolloLab la sua cartella non è più nel pacchetto. LolloLab continua a importare i file **.screenai.json** che esporta.

- Dal menu dell’icona scegli **Cattura idea per Repo Atlas** oppure usa la normale cattura Ctrl+Alt+S.
- Nel risultato premi **Esporta per Repo Atlas**. Se la finestra dei risultati è disattivata, apri **Ultima risposta** dal menu.
- Salva il .screenai.json e importalo nella finestra Screenshot / ScreenAI di Repo Atlas. Contiene immagine, risposta, richiesta, modello, provider e data; non contiene credenziali.
- L’immagine esportata è quella effettivamente inviata al modello, dopo gli eventuali oscuramenti o ritagli. La copia non oscurata non viene recuperata.
- La vecchia cronologia ScreenAI conserva solo il testo. Per quelle analisi il pulsante di esportazione con immagine rimane disabilitato: l’immagine non esiste e non viene inventata.

Il passaggio fra le due app in questa versione avviene **tramite file**: non è un invio automatico in background e non richiede un server HTTP aperto da ScreenAI. Importare un’analisi già pronta non fa una nuova chiamata IA.

### Immagini, backup e compatibilità

Massimo **4 MB per immagine**, **64 MB per archivio** e 5000 schede. Se l’immagine è troppo grande viene rifiutata senza ricomprimerla silenziosamente. Ritagliala o scegli una qualità inferiore in ScreenAI.

Il backup JSON completo e il backup Drive includono le immagini e l’analisi originale. XLSX/PDF restano riepiloghi testuali: non sostituiscono il JSON. Le schermate non sono incluse nei log diagnostici. Nel browser la copia di emergenza estesa usa IndexedDB; la sua disponibilità dipende da spazio e permessi del browser. Mantieni comunque un backup su file.

Si importa schema 1/2/3 e si scrive **schema 4**. Prima di aggiornare salva un backup JSON completo.

## Novità 1.4.0: archivio per idee da riutilizzare

- Modalità chiara, scura e Segui il dispositivo. Il pulsante in testata passa rapidamente fra chiaro e scuro; la scelta è salvata e inclusa nel backup.
- **Progetti da controllare**: raccolta predefinita di repository e risorse esterne. **Idee e link**: schede senza repository. **I miei progetti GitHub**: soltanto repository archiviati dell’account indicato in Impostazioni (predefinito baudinolorenzo73). **Tutto l’archivio**: tutte le schede.
- Puoi archiviare repository GitHub, link HTTP/HTTPS e idee personali anche senza link. Ogni scheda ha titolo, descrizione, cosa vuoi riutilizzare, progetto collegato, tag e note.
- La ricerca nell’archivio comprende anche titolo, tag e indicazioni di riutilizzo.
- **Cerca web / GitHub** è sempre visibile nella navigazione. La ricerca GitHub mostra risultati e pulsante Archivia da controllare. La ricerca web apre Google o DuckDuckGo in una scheda esterna: per conservare un risultato, copia il link e usa Aggiungi → Link web.
- Nella raccolta personale, **Importa miei repository pubblici** legge i repository pubblici dell’account e aggiunge quelli assenti, senza sostituire le tue note. Non è una ricerca dei repository privati.
- **Aggiorna GitHub** controlla tutti i repository archiviati, compresi quelli personali; il comando selezionati controlla soltanto la selezione. Mostra un avviso sulle schede cambiate e, quando disponibili due commit differenti, il collegamento Vedi modifiche. Il primo controllo crea una base di confronto; le idee e i link web non hanno commit da confrontare. Il controllo usa ultimo push e commit del ramo predefinito, non è una verifica di ogni file o release.
- **Aggiorna app** confronta la versione caricata con version.json pubblicato nello stesso sito. Se esiste un aggiornamento richiede di salvare prima il file completo e propone Ricarica app. Per rendere disponibile una nuova versione devi prima pubblicare il pacchetto aggiornato su GitHub Pages.
- Le analisi IA di link e idee usano descrizione, note e riutilizzo salvati. Non viene scaricato o letto automaticamente il sito esterno. Serve un modello configurato in Impostazioni: l’analisi parte direttamente dal browser.
- Esportazioni e backup comprendono i nuovi campi. Log e verifiche delle credenziali restano disponibili.

### Compatibilità dei dati

Questa versione importa i backup schema 1 e scrive schema 2, necessario per idee e link web. I vecchi repository diventano schede GitHub senza perdere note, analisi o README; lo stato Da valutare diventa Da controllare. Gli identificativi delle schede GitHub restano uguali. Le versioni precedenti dell’app non possono aprire lo schema 2: conserva il backup precedente prima di aggiornare. Il nuovo server Python deve essere aggiornato insieme ai file web.

Per aggiornare, esporta un backup completo e pubblica l’intero ZIP con Pubblica; non sovrapporre una seconda trasformazione PWA.

## Novità 1.3.1: errori spiegati e log

- Guida agli errori in Impostazioni: causa, rimedio e accesso al campo da correggere.
- Verifiche preventive per chiave/modello IA mancanti e Client ID Google assente o non valido.
- Stato della configurazione salvata; la presenza di una chiave non è presentata come prova della sua validità.
- Pulsante Collega Google: ottiene il token con il consenso. Non occorre incollare access token o client secret. Il token valido viene riutilizzato solo per i permessi già concessi, finché non scade.
- Errori distinti per chiave rifiutata, quota/credito, troppe richieste, modello non disponibile, server locale/Ollama spento, popup Google chiuso o bloccato, permessi/API Google mancanti, file non valido, conflitti e scrittura negata.
- Esporta log diagnostico da Backup ed esportazioni, Impostazioni o dal messaggio di errore.

### Pulsanti per verificare credenziali e servizi

- **Verifica chiave IA / Ollama** usa i campi mostrati in Impostazioni, anche prima di salvarli. Con Groq e OpenAI legge il catalogo modelli; con Ollama controlla il servizio e l’eventuale modello; con OpenRouter controlla la chiave corrente. Non genera testo. Richiede l’assistente sul PC. Una chiave accettata non garantisce credito o accesso a tutte le funzioni; il risultato lo indica.
- **Verifica token GitHub** autentica il token inserito usando una richiesta all’account. Non salva l’identità nei log e non garantisce l’accesso a ogni repository privato. Il token resta facoltativo per consultare repository pubblici.
- **Verifica accesso Google** controlla il token temporaneo già ottenuto con Collega Google e il permesso Drive, usando una sola lettura. Non crea file e non verifica separatamente Sheets. Se manca il token o è scaduto, indica di ricollegare Google.
- **Verifica campi salvati** aggiorna soltanto il riepilogo locale: non è una verifica delle credenziali presso i servizi.

Le verifiche di chiave IA e GitHub non salvano automaticamente i campi digitati. Premi Salva configurazione per utilizzarli nelle altre operazioni. Per Google il Client ID deve essere prima salvato.

### Come inviare un errore

1. Dopo il problema premi **Esporta log diagnostico**.
2. Allega il file Repo_Atlas_log_DATA.json alla chat e indica il pulsante che avevi premuto.
3. Non inviare le tue chiavi API o token. Il log generato non li include.

Il browser conserva gli ultimi 300 eventi anche dopo una ricarica, se la memorizzazione è disponibile. Il server scrive in data/diagnostica.jsonl e ruota oltre 512 KB in diagnostica-precedente.jsonl; il log esportato include fino a 300 eventi recenti del server quando raggiungibile. Se il server non risponde, il log del browser resta esportabile e segnala che la parte server non è stata raccolta. Il file sul PC permette di recuperare anche errori precedenti.

Il registro include orario, versione, codice, operazione, servizio e stato HTTP se disponibile; per gli errori browser include soltanto il nome di uno script dell’app e riga/colonna. Esclude chiavi, token, note, README, catalogo, nomi modello, URL, messaggi grezzi dei servizi e stack completi. Se il browser o il disco non consentono la scrittura, il registro disponibile può essere solo in memoria.

Le istruzioni specifiche di Google Cloud sono nella schermata Impostazioni. Le diagnosi basate solo su HTTP 403 indicano le cause possibili senza dichiararne una certa. Nessun sistema può prevedere ogni errore: i casi sconosciuti mostrano un rimedio generale e consentono l’esportazione del log.

## Novità 1.3.0

- Navigazione: Catalogo, Aggiungi link, Backup ed esportazioni, Impostazioni.
- La schermata iniziale contiene ricerca, filtri e schede. Backup ed esportazioni sono separati.
- Nuovo filtro per stato e vista del dettaglio dedicata agli schermi piccoli, con Torna al catalogo.
- I comandi collettivi appaiono solo con una selezione; un cambio di filtro la annulla.
- Il controllo GitHub conserva le descrizioni personali. I rapporti salvati sono consultabili nella scheda.
- Corretta la perdita di seedVersion nel server: le cancellazioni dei progetti predefiniti restano valide dopo il riavvio.
- Uscita con file salvato; copia Drive facoltativa, oppure obbligatoria se spunti la relativa opzione.

- La scelta del file su disco sostituisce anche la vecchia copia di emergenza, evitando richieste di recupero ripetute.

### Aggiornamento dalla versione precedente

Prima esporta un file completo, poi pubblica l’intero ZIP con Pubblica.

I nomi del database e lo schema JSON restano uguali. La versione precedente del server non conservava seedVersion: se disponibile viene recuperata da una copia browser con le stesse schede. Se manca una copia confrontabile, i vecchi archivi senza versione ricevono una sola integrazione dei progetti predefiniti; le cancellazioni successive sono rispettate. Eventuali dati già sovrascritti dalla versione precedente richiedono il recupero da un backup.

## Novità 1.2.0

- Aggiunti nove repository individuati nel progetto Pubblica: sei riferimenti principali e tre progetti classificati **Da provare**.
- Nuove categorie per **GPX e trekking** e **API e dati**.
- L'aggiornamento integra automaticamente le nuove schede negli archivi precedenti senza modificare o sostituire le schede già presenti.
- Aggiornata la cache PWA; note, analisi, impostazioni e archivi JSON esistenti restano conservati.

Il catalogo ha ora un archivio principale su file JSON e una copia completa su Google Drive. Il browser conserva una copia di emergenza; non è l’unico posto in cui conservare il lavoro.

## Salvataggio manuale (dalla 1.9.0)

Dalla 1.9.0 non esiste più l'assistente PC (server.py, AVVIA_WINDOWS.bat, avvia.sh): LolloLab è solo browser e PWA.

1. Il catalogo vive nel browser, con una copia di emergenza anche in IndexedDB.
2. Il file lo salvi tu, **a ogni chiusura**: premi **💾 Salva** in alto: scrive il file completo e, se hai collegato Google, anche la copia su Drive. Nei browser che lo permettono si sceglie il file e lo si riscrive; sugli altri parte un download di `Repo_Atlas_catalogo.json` e va confermato dopo averlo controllato.
3. Lo stato in alto dice «○ Da salvare su file» finché il file non è aggiornato, e torna così a ogni modifica.
4. Se chiudi la pagina con modifiche non salvate, il browser chiede conferma. L'avviso dipende dal browser e non compare con la chiusura forzata di Android.
5. Per riprendere il lavoro su un altro dispositivo: **Apri archivio JSON**.

Se hai ancora una cartella `data/` della vecchia versione, il suo `catalogo.json` si apre con **Apri archivio JSON**: il formato è lo stesso.

## Come chiudere

**💾 Salva** (in alto, sempre visibile) fa tutto in un colpo:

- **File completo**: nei browser compatibili scrive il file scelto da te; sugli altri parte un download da confermare dopo averlo controllato.
- **Drive**: solo se hai collegato Google (Impostazioni → Google Drive): carica anche un nuovo JSON completo con data e ora nel nome.
- Lo stato «○ Da salvare su file» in alto resta finché il file non corrisponde alla versione corrente.

Il backup completo comprende sempre tutte le schede, anche quelle nascoste dai filtri o non selezionate: descrizioni, categorie, stati, priorità, note, metadati GitHub, README, analisi IA, rapporti di controllo, provider/modello e Client ID Google.

Sono escluse chiavi API, token GitHub e credenziali OAuth. Le chiavi vanno reinserite nella sessione successiva.

Il browser può mostrare un avviso alla chiusura se mancano salvataggi o ci sono operazioni in corso. Questo avviso non è garantito su tutti i dispositivi, specialmente dopo una chiusura forzata su Android: non viene mai avviato un caricamento Drive affidandosi all’ultimo istante di chiusura.

## Google Drive

L’app scaricata non eredita l’accesso Drive di ChatGPT. Per attivare i pulsanti diretti:

1. In un tuo progetto Google Cloud abilita **Google Drive API**.
2. Configura consenso OAuth ed eventuali utenti di test.
3. Crea un Client ID OAuth per applicazione web, autorizzando l’origine esatta dell’app: l’origine HTTPS di GitHub Pages (https://baudinolorenzo73.github.io).
4. Inserisci il Client ID in Configurazione e salva. Non serve un client secret.
5. Premi 💾 Salva e scegli l’account nel consenso Google.

Per il backup viene richiesto il permesso drive.file, limitato ai file creati/aperti tramite questa app. Ogni backup crea un nuovo JSON datato in Il mio Drive. La creazione e la dimensione del file vengono verificate con una rilettura dei metadati prima di mostrare **copia confermata**. Se rete o autorizzazione falliscono, Drive rimane **backup da fare** e la copia locale resta disponibile.

Per riaprire un backup remoto scaricalo da Drive e usa **Apri archivio JSON**. Non esiste ancora una ricerca dei backup Drive dentro Repo Atlas.

Per un foglio di calcolo esporta in **Excel (.xlsx)**: si apre anche con Google Sheets dopo averlo caricato su Drive.

## Uso statico, GitHub Pages e telefoni

Il catalogo non ha bisogno di nessun server. **Salva file completo** usa il selettore di file nei browser compatibili; sugli altri avvia un download e chiede di verificare che il JSON sia nei Download.

All’apertura, **Apri archivio JSON** ricarica il file completo sostituendo le schede in lavoro dopo conferma. **Importa JSON** rimane una fusione, con sostituzione dei duplicati. Prima di sostituire un archivio, conserva un backup se vuoi mantenere il lavoro corrente.

I permessi per i file scelti non sono mantenuti automaticamente dopo la chiusura. Il browser conserva una copia di emergenza del catalogo; cancellare i dati del browser non cancella i file JSON già salvati.

Il pacchetto è pronto per Pubblica: file web alla radice, percorsi relativi, manifest, icone e service worker. Non attivare un’altra trasformazione PWA. Archivio, esportazioni, GitHub, IA dal browser e OAuth Google funzionano da GitHub Pages con le rispettive configurazioni.

La cache conserva l’interfaccia offline dopo il primo caricamento HTTP/HTTPS. GitHub, Drive e IA cloud richiedono rete; con Ollama sul PC l’analisi funziona anche senza Internet.

## IA e controllo repository

Configurazione: scegli Ollama locale, Groq, OpenRouter o OpenAI API e inserisci il nome esatto del modello. La richiesta parte dal browser: Groq, OpenRouter e OpenAI funzionano con la tua chiave (solo in sessione). Con Ollama il browser deve poter raggiungere http://127.0.0.1:11434: avvialo con OLLAMA_ORIGINS impostato all’indirizzo dell’app (es. https://baudinolorenzo73.github.io), altrimenti la richiesta viene bloccata.

**Controlla GitHub** legge descrizione, README, stelle, licenza, linguaggio, ultimo push e stato archiviato. Un token GitHub facoltativo aumenta i limiti delle API.

**Spiegami con IA** invia al provider README e metadati della scheda dopo conferma. Non è un audit di sicurezza e non equivale a eseguire il progetto.

Il vecchio «Scarica e controlla» (ZIP del repository) è stato tolto con l’assistente PC: i rapporti già salvati nelle schede restano visibili.

## Esportazioni e compatibilità

- **File completo / Drive**: archivio completo e configurazione non segreta, indipendente dai filtri.
- **Esporta selezione JSON, Excel e PDF**: usano le schede selezionate; senza selezione usano i risultati filtrati.
- XLSX: vero Office Open XML senza librerie esterne, celle testuali; massimo Excel 32767 caratteri per cella. Il JSON conserva anche i testi più lunghi.
- PDF: Stampa / PDF apre la stampa del browser, quindi scegli Salva come PDF. Comprende descrizioni, note e analisi, senza README.
- Importazioni: JSON massimo 10 MB e 5000 schede. I JSON v1.0 sono compatibili; le chiavi API non vengono importate.

## Verifiche e limiti

Verificati sintassi JavaScript, salvataggio e rilettura JSON, validazione, esclusione delle chiavi, completezza del backup, analisi IA dal browser con provider simulato e avviso di chiusura.

Il salvataggio Drive/OAuth e le chiamate ai modelli IA richiedono collaudo con credenziali reali dell’utente. Non sono presentati come già verificati con un account reale. Anche installazione PWA e comportamento specifico del selettore di file dipendono dal browser usato.

Fonti di riferimento del progetto originale: https://developers.google.com/workspace/drive/api/guides/manage-uploads ; https://developers.google.com/workspace/drive/api/guides/api-specific-auth ; https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker ; https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload


## Test

- `node tests/app.cjs` (Node 18+), `node tests/sw.cjs`
- Con Playwright e Chromium: `node tests/api.cjs` e `node tests/ia.cjs` (IA dal browser e salvataggio manuale).

VERIFICA.md distingue i controlli automatici da quelli ancora da fare. Non sono state usate credenziali reali per OAuth o IA.
