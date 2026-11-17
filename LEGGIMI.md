# Repo Atlas 1.5.0 — integrazione ScreenAI

## Nuovo flusso: cattura, archivia, valuta più tardi

1. Premi **Screenshot / ScreenAI**.
2. Carica un PNG/JPEG/WebP, incolla un’immagine con Ctrl+V nella finestra (PC) oppure importa un .screenai.json.
3. Puoi usare **Analizza immagine con IA**, aggiungere un appunto o saltare l’analisi.
4. Premi **Archivia da valutare**. La scheda finisce in **Schermate da valutare**, con stato Da controllare.
5. Quando vuoi riprenderla, apri la scheda: l’immagine e l’analisi iniziale sono conservate. Aggiungi cosa vuoi riutilizzare, per quale progetto, tag e note; cambia stato quando hai deciso.

Il flusso è disponibile anche per schermate non relative a GitHub. I link delle fonti vanno confermati: non vengono inventati o aperti automaticamente dall’IA. L’analisi integrata usa il provider/modello già configurato in Repo Atlas e richiede un modello vision e l’assistente PC. L’archiviazione senza analisi funziona senza provider e offline. Un controllo positivo della chiave API non dimostra che il modello supporti le immagini.

### Collegamento con ScreenAI 1.8 per Windows

Il pacchetto include la cartella **ScreenAI_Windows_v1.8**, con sorgenti completi e **compila-portatile.bat**. Sono stati aggiornati i sorgenti; qui non è stata eseguita una compilazione .NET/Windows e non è incluso un nuovo EXE già compilato.

- Dal menu dell’icona scegli **Cattura idea per Repo Atlas** oppure usa la normale cattura Ctrl+Alt+S.
- Nel risultato premi **Esporta per Repo Atlas**. Se la finestra dei risultati è disattivata, apri **Ultima risposta** dal menu.
- Salva il .screenai.json e importalo nella finestra Screenshot / ScreenAI di Repo Atlas. Contiene immagine, risposta, richiesta, modello, provider e data; non contiene credenziali.
- L’immagine esportata è quella effettivamente inviata al modello, dopo gli eventuali oscuramenti o ritagli. La copia non oscurata non viene recuperata.
- La vecchia cronologia ScreenAI conserva solo il testo. Per quelle analisi il pulsante di esportazione con immagine rimane disabilitato: l’immagine non esiste e non viene inventata.

Il passaggio fra le due app in questa versione avviene **tramite file**: non è un invio automatico in background e non richiede un server HTTP aperto da ScreenAI. Importare un’analisi già pronta non fa una nuova chiamata IA.

### Immagini, backup e compatibilità

Massimo **4 MB per immagine**, **64 MB per archivio** e 5000 schede. Se l’immagine è troppo grande viene rifiutata senza ricomprimerla silenziosamente. Ritagliala o scegli una qualità inferiore in ScreenAI.

Il backup JSON completo e il backup Drive includono le immagini e l’analisi originale. CSV/XLSX/PDF restano riepiloghi testuali: non sostituiscono il JSON. Le schermate non sono incluse nei log diagnostici. Nel browser la copia di emergenza estesa usa IndexedDB; la sua disponibilità dipende da spazio e permessi del browser. Mantieni comunque un backup su file.

Si importa schema 1/2/3 e si scrive **schema 3**, per impedire che le vecchie versioni eliminino immagini che non sanno gestire. Prima di aggiornare salva un backup e conserva data e downloads. Aggiorna anche server.py. Nessuna migrazione può recuperare immagini non archiviate dalle vecchie versioni di ScreenAI.

## Novità 1.4.0: archivio per idee da riutilizzare

- Modalità chiara, scura e Segui il dispositivo. Il pulsante in testata passa rapidamente fra chiaro e scuro; la scelta è salvata e inclusa nel backup.
- **Progetti da controllare**: raccolta predefinita di repository e risorse esterne. **Idee e link**: schede senza repository. **I miei progetti GitHub**: soltanto repository archiviati dell’account indicato in Impostazioni (predefinito baudinolorenzo73). **Tutto l’archivio**: tutte le schede.
- Puoi archiviare repository GitHub, link HTTP/HTTPS e idee personali anche senza link. Ogni scheda ha titolo, descrizione, cosa vuoi riutilizzare, progetto collegato, tag e note.
- La ricerca nell’archivio comprende anche titolo, tag e indicazioni di riutilizzo.
- **Cerca web / GitHub** è sempre visibile nella navigazione. La ricerca GitHub mostra risultati e pulsante Archivia da controllare. La ricerca web apre Google o DuckDuckGo in una scheda esterna: per conservare un risultato, copia il link e usa Aggiungi → Link web.
- Nella raccolta personale, **Importa miei repository pubblici** legge i repository pubblici dell’account e aggiunge quelli assenti, senza sostituire le tue note. Non è una ricerca dei repository privati.
- **Aggiorna GitHub** controlla tutti i repository archiviati, compresi quelli personali; il comando selezionati controlla soltanto la selezione. Mostra un avviso sulle schede cambiate e, quando disponibili due commit differenti, il collegamento Vedi modifiche. Il primo controllo crea una base di confronto; le idee e i link web non hanno commit da confrontare. Il controllo usa ultimo push e commit del ramo predefinito, non è una verifica di ogni file o release.
- **Aggiorna app** confronta la versione caricata con version.json pubblicato nello stesso sito. Se esiste un aggiornamento richiede di salvare prima il file completo e propone Ricarica app. Per rendere disponibile una nuova versione devi prima pubblicare il pacchetto aggiornato su GitHub Pages.
- Le analisi IA di link e idee usano descrizione, note e riutilizzo salvati. Non viene scaricato o letto automaticamente il sito esterno. Servono l’assistente PC e un modello configurato come prima.
- Esportazioni e backup comprendono i nuovi campi. Log e verifiche delle credenziali restano disponibili.

### Compatibilità dei dati

Questa versione importa i backup schema 1 e scrive schema 2, necessario per idee e link web. I vecchi repository diventano schede GitHub senza perdere note, analisi o README; lo stato Da valutare diventa Da controllare. Gli identificativi delle schede GitHub restano uguali. Le versioni precedenti dell’app non possono aprire lo schema 2: conserva il backup precedente prima di aggiornare. Il nuovo server Python deve essere aggiornato insieme ai file web.

Per aggiornare, esporta un backup completo, sostituisci i file del programma conservando data e downloads e riavvia il server. Per GitHub Pages pubblica l’intero ZIP; non sovrapporre una seconda trasformazione PWA.

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
- Ricarica archivio locale permette di recuperare dai conflitti fra finestre senza disabilitare il controllo di revisione.
- La scelta del file su disco sostituisce anche la vecchia copia di emergenza, evitando richieste di recupero ripetute.

### Aggiornamento dalla versione precedente

Prima esporta un file completo. Estrai lo ZIP e sostituisci i file del programma, conservando le cartelle data e downloads. Riavvia il server. Per GitHub Pages carica il pacchetto completo con Pubblica e riapri l’app dopo l’aggiornamento.

I nomi del database e lo schema JSON restano uguali. La versione precedente del server non conservava seedVersion: se disponibile viene recuperata da una copia browser con le stesse schede. Se manca una copia confrontabile, i vecchi archivi senza versione ricevono una sola integrazione dei progetti predefiniti; le cancellazioni successive sono rispettate. Eventuali dati già sovrascritti dalla versione precedente richiedono il recupero da un backup.

## Novità 1.2.0

- Aggiunti nove repository individuati nel progetto Pubblica: sei riferimenti principali e tre progetti classificati **Da provare**.
- Nuove categorie per **GPX e trekking** e **API e dati**.
- L'aggiornamento integra automaticamente le nuove schede negli archivi precedenti senza modificare o sostituire le schede già presenti.
- Aggiornata la cache PWA; note, analisi, impostazioni e archivi JSON esistenti restano conservati.

Il catalogo ha ora un archivio principale su file JSON e una copia completa su Google Drive. Il browser conserva una copia di emergenza; non è l’unico posto in cui conservare il lavoro.

## Avvio e archivio locale

1. Estrai tutto lo ZIP sul PC. Python 3.10+ è l’unico requisito dell’assistente locale.
2. Avvia AVVIA_WINDOWS.bat. Si apre http://localhost:8765. Mantieni aperta la finestra del server.
3. Al primo avvio premi **Salva file completo**. Viene creato **data/catalogo.json**, con tutte le schede e la configurazione non segreta.
4. Ogni modifica successiva viene scritta automaticamente nello stesso file. Il salvataggio è atomico: viene preparato un temporaneo, scaricato sul disco e sostituito il file completo soltanto a scrittura riuscita.
5. Prima di ogni sostituzione viene conservata la versione precedente in **data/storico**. La cartella non viene ripulita automaticamente: puoi archiviarla e gestirne lo spazio.
6. All’avvio successivo il programma rilegge il file su disco. Se la copia di emergenza del browser è diversa, propone di recuperarla oppure di usare il file.
7. Se due finestre modificano lo stesso catalogo, il controllo di revisione blocca la sovrascrittura: esporta un JSON di sicurezza, usa **Backup ed esportazioni → Ricarica archivio locale**, poi riconcilia le modifiche.

I file data non vengono serviti come risorse pubbliche dal server. Per fare un backup manuale puoi copiare l’intera cartella data. Puoi anche tenere il programma in una cartella sincronizzata da Google Drive per desktop: la sincronizzazione resta gestita da quel programma, e non sostituisce la conferma del backup diretto nell’app.

Linux/macOS: esegui python3 server.py nella cartella del progetto.

## Salva ed esci

Il pulsante apre due passaggi distinti:

- **1. Salva file completo**: verifica il salvataggio su disco; nell’uso statico propone un file JSON scelto dall’utente.
- **2. Salva su Drive**: passaggio facoltativo; autorizza Google e carica un nuovo JSON completo con data e ora nel nome.
- **Concludi sessione**: disponibile quando il file corrisponde alla versione corrente. Spuntando “Richiedi anche una copia Drive” occorre anche quel backup. Il messaggio finale invita a chiudere la scheda; l’app non termina il server.

Il backup completo comprende sempre tutte le schede, anche quelle nascoste dai filtri o non selezionate: descrizioni, categorie, stati, priorità, note, metadati GitHub, README, analisi IA, rapporti di controllo, provider/modello e Client ID Google.

Sono esclusi chiavi API, token GitHub, credenziali OAuth, file ZIP scaricati in downloads e l’intero storico delle versioni. Per conservare anche ZIP e storico copia la cartella del programma. Le chiavi vanno reinserite nella sessione successiva.

Il browser può mostrare un avviso alla chiusura se mancano salvataggi o ci sono operazioni in corso. Questo avviso non è garantito su tutti i dispositivi, specialmente dopo una chiusura forzata su Android: non viene mai avviato un caricamento Drive affidandosi all’ultimo istante di chiusura.

## Google Drive e Sheets

L’app scaricata non eredita l’accesso Drive di ChatGPT. Per attivare i pulsanti diretti:

1. In un tuo progetto Google Cloud abilita **Google Drive API**; abilita anche **Google Sheets API** se vuoi esportare in Sheets.
2. Configura consenso OAuth ed eventuali utenti di test.
3. Crea un Client ID OAuth per applicazione web, autorizzando l’origine esatta dell’app: http://localhost:8765 per l’avvio locale oppure l’origine HTTPS di GitHub Pages.
4. Inserisci il Client ID in Configurazione e salva. Non serve un client secret.
5. Usa Backup completo su Drive o Salva ed esci e scegli l’account nel consenso Google.

Per il backup viene richiesto il permesso drive.file, limitato ai file creati/aperti tramite questa app. Ogni backup crea un nuovo JSON datato in Il mio Drive. La creazione e la dimensione del file vengono verificate con una rilettura dei metadati prima di mostrare **copia confermata**. Se rete o autorizzazione falliscono, Drive rimane **backup da fare** e la copia locale resta disponibile.

Per riaprire un backup remoto scaricalo da Drive e usa **Apri archivio JSON**. Non esiste ancora una ricerca dei backup Drive dentro Repo Atlas.

Le esportazioni **Google Sheets** restano rapporti separati: creare un foglio non sostituisce il backup JSON completo. In alternativa carica un XLSX in Drive e aprilo con Google Sheets.

## Uso statico, GitHub Pages e telefoni

Il catalogo funziona anche senza il server Python. **Salva file completo** usa il selettore di file nei browser compatibili; la scrittura viene confermata dopo la chiusura del file. Sugli altri browser avvia un download e chiede di verificare che il JSON sia effettivamente presente nei Download prima di marcarlo come salvato. L’app non può verificare da sola un download standard.

All’apertura, **Apri archivio JSON** ricarica il file completo sostituendo le schede in lavoro dopo conferma. **Importa JSON** rimane una fusione, con sostituzione dei duplicati. Prima di sostituire un archivio, conserva un backup se vuoi mantenere il lavoro corrente.

I permessi per i file scelti non sono mantenuti automaticamente dopo la chiusura. Il browser conserva una copia di emergenza del catalogo; cancellare i dati del browser non cancella i file JSON già salvati.

Il pacchetto è pronto per Pubblica: file web alla radice, percorsi relativi, manifest, icone e service worker. Non attivare un’altra trasformazione PWA. Il server Python non viene eseguito da GitHub Pages. IA e controlli degli ZIP richiedono l’avvio locale; archivio, esportazioni, GitHub e OAuth Google funzionano nel browser con i relativi requisiti di rete.

La cache conserva l’interfaccia offline dopo il primo caricamento HTTP/HTTPS; non conserva token o risposte delle API locali. Con Ollama e README già salvati, l’analisi può funzionare senza Internet. GitHub, Drive e IA cloud richiedono rete.

## IA e controllo repository

Configurazione: scegli Ollama locale, Groq, OpenRouter o OpenAI API e inserisci il nome esatto del modello. Con Ollama verifica i modelli disponibili con ollama list. Non vengono scaricati modelli automaticamente.

**Controlla GitHub** legge descrizione, README, stelle, licenza, linguaggio, ultimo push e stato archiviato. Un token GitHub facoltativo aumenta i limiti delle API.

**Spiegami con IA** invia al provider README e metadati della scheda dopo conferma. Non è un audit di sicurezza e non equivale a eseguire il progetto.

**Scarica e controlla** salva lo ZIP pubblico del commit corrente nella cartella downloads, riporta commit e SHA256, rileva tecnologie e verifica fino a 80 file JSON/Python. Limiti: 25 MB compressi, 150 MB decompressi, 15000 voci, file di controllo fino a 1 MB. Il rapporto è incluso nel successivo archivio completo.

Se è presente index.html offre un’anteprima isolata con rete e permessi bloccati. Non installa dipendenze né esegue comandi del repository. Android, Zepp, Docker e progetti che richiedono build hanno ancora bisogno di compilazione e prova manuale.

## Esportazioni e compatibilità

- **File completo / Drive**: archivio completo e configurazione non segreta, indipendente dai filtri.
- **Esporta selezione JSON, Excel, CSV, PDF e Sheets**: usano le schede selezionate; senza selezione usano i risultati filtrati.
- XLSX: vero Office Open XML senza librerie esterne, celle testuali; massimo Excel 32767 caratteri per cella. Il JSON conserva anche i testi più lunghi.
- PDF: Stampa / PDF apre la stampa del browser, quindi scegli Salva come PDF. Comprende descrizioni, note e analisi, senza README.
- Importazioni: JSON massimo 10 MB e 5000 schede. I JSON v1.0 sono compatibili; le chiavi API non vengono importate.

## Verifiche e limiti

Verificati sintassi JavaScript/Python, salvataggio e rilettura JSON, storico, blocco dei conflitti tra revisioni, validazione, esclusione delle chiavi e completezza del backup anche con selezioni attive. Restano validi i test XLSX e del servizio locale della versione 1.0.

Il salvataggio Drive/OAuth e le chiamate ai modelli IA richiedono collaudo con credenziali reali dell’utente. Non sono presentati come già verificati con un account reale. Anche installazione PWA e comportamento specifico del selettore di file dipendono dal browser usato.

Fonti di riferimento del progetto originale: https://developers.google.com/workspace/drive/api/guides/manage-uploads ; https://developers.google.com/workspace/drive/api/guides/api-specific-auth ; https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker ; https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload


## Test della versione 1.3.0

- Python: `python -m unittest discover -s tests`.
- JavaScript: `node tests/app.cjs` (Node 18+).
- Browser, in un ambiente con Playwright e Chromium: `node tests/ui.cjs`. La variabile CHROMIUM_PATH permette di indicare un eseguibile installato.

Il rapporto VERIFICA.md distingue controlli automatici eseguiti da prove ancora da fare. Non sono state usate credenziali reali per OAuth o IA.
