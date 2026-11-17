# Guida agli errori e ai log — Repo Atlas 1.5.0

Il Client ID Google identifica l’app. Il token di accesso viene ottenuto automaticamente dal consenso ed è temporaneo; non va incollato nel Client ID. Le chiavi IA cloud sono invece fornite dall’account del provider.

In caso di problema: Esporta log diagnostico e invia il JSON insieme al pulsante premuto. Il log esclude chiavi, token e contenuti delle schede. Non tutti gli errori sono identificabili con certezza dal solo codice HTTP: le indicazioni riportano anche le cause possibili.

| Codice | Problema | Cosa fare |
| --- | --- | --- |
| CAPTURE_INVALID | Schermata non valida | Usa un’immagine PNG, JPEG o WebP reale. Non sono ammessi SVG, URL remoti o altri formati nel campo immagine. Puoi anche importare un file .screenai.json prodotto da ScreenAI 1.8. |
| CAPTURE_TOO_LARGE | Schermata troppo grande | Il limite è 4 MB per immagine. Ritaglia la schermata o riduci la risoluzione prima di caricarla. In ScreenAI scegli qualità Auto o Bassa e ripeti la cattura. |
| CAPTURE_MISSING | Manca la schermata | Scegli un file immagine, incolla uno screenshot con Ctrl+V nella finestra oppure importa un file .screenai.json. |
| SCREENAI_INVALID | File ScreenAI non valido | Importa il file .screenai.json esportato dal pulsante Esporta per Repo Atlas di ScreenAI 1.8. Un vecchio TXT o una voce della cronologia non contengono l’immagine originale. |
| WEB_URL_INVALID | Link web non valido | Usa un indirizzo completo che inizi con https:// o http://, senza nome utente o password nell’indirizzo. Per un’idea personale puoi lasciare la fonte vuota. |
| SEARCH_EMPTY | Inserisci che cosa cercare | Scrivi un argomento o il nome di un progetto, poi scegli Cerca su GitHub oppure Cerca sul web. |
| GITHUB_OWNER_INVALID | Account GitHub non valido | In Impostazioni inserisci soltanto il nome utente GitHub, senza URL o nome del repository. |
| GITHUB_ONLY | Nessun repository GitHub da controllare | Questo comando controlla soltanto i repository GitHub. Idee e link web restano nell’archivio, ma non hanno commit GitHub da confrontare. |
| IDEA_TEXT_REQUIRED | Aggiungi il contenuto da analizzare | Per idee e link web l’IA usa soltanto il testo salvato nella scheda. Compila descrizione, note o Cosa voglio riutilizzare; il sito non viene letto automaticamente. |
| REPO_INVALID | Indirizzo GitHub non valido | Inserisci un indirizzo del tipo https://github.com/proprietario/repository oppure proprietario/repository. Non usare il link a una singola pagina, issue o file. |
| REPO_DUPLICATE | Risorsa già nell’archivio | Cerca la scheda esistente e usa Modifica. Se stai cambiando indirizzo, scegli una risorsa che non sia già presente. |
| SELECTION_MISSING | Nessun repository selezionato | Spunta almeno una scheda nel catalogo e ripeti l’operazione. Cambiare filtro annulla le selezioni precedenti. |
| ARCHIVE_VERSION | Versione JSON non supportata | Questa versione importa gli schemi 1, 2 e 3. Aggiorna Repo Atlas oppure scegli un backup compatibile. Il catalogo in lavoro resta invariato. |
| ARCHIVE_DUPLICATE | Repository duplicati nel file JSON | Il file contiene più schede per lo stesso repository. Correggi i duplicati oppure usa un backup valido prima di importare. |
| ZIP_LIMIT | Archivio ZIP oltre i limiti | Il controllo ammette al massimo 25 MB compressi, 150 MB decompressi e 15000 file. Valuta il repository manualmente in un ambiente adatto. |
| ZIP_INVALID | Archivio ZIP non supportato | Il file scaricato è vuoto, danneggiato o contiene percorsi/link non ammessi. Non è stato eseguito codice del repository. |
| AI_KEY_MISSING | Manca la chiave API IA | Il provider cloud richiede una chiave. Apri Impostazioni, scegli il provider, inserisci la sua chiave API e salva. La chiave resta soltanto nella sessione: va reinserita dopo aver riaperto l’app. Ollama locale non richiede una chiave. |
| AI_MODEL_MISSING | Manca il modello IA | Inserisci in Impostazioni il nome esatto di un modello disponibile presso il provider scelto. Con Ollama usa il nome di un modello già installato sul PC. |
| AI_AUTH | Chiave IA non accettata | La chiave potrebbe essere errata, revocata o appartenere a un altro provider. Genera o copia la chiave corretta dal tuo account e reinseriscila. |
| AI_PERMISSION | Accesso IA non consentito | Il servizio ha rifiutato l’accesso. Verifica permessi della chiave, disponibilità del modello e restrizioni dell’account o della rete. |
| AI_MODEL | Modello o endpoint IA non disponibile | Controlla il nome del modello e che il tuo account possa usarlo. Con Ollama verifica che il modello sia installato e il servizio avviato. |
| AI_QUOTA | Credito o quota IA esauriti | Controlla credito, fatturazione e limiti nel pannello del provider. Riprovare subito non risolve un credito esaurito. |
| AI_RATE | Troppe richieste al servizio IA | Attendi qualche minuto e riprova con meno repository. Controlla i limiti del provider. Non è necessariamente un problema di credito. |
| AI_REQUEST | Richiesta IA non accettata | Il modello potrebbe non supportare i parametri o la quantità di testo. Per uno screenshot deve supportare anche le immagini: una chiave verificata non basta. Prova un modello vision compatibile con chat/completions. |
| AI_EMPTY | Il modello non ha restituito testo | Prova di nuovo o scegli un altro modello. L’analisi precedente, se esiste, resta conservata. |
| LOCAL_REQUIRED | Serve l’assistente sul PC | Per analisi IA e controllo ZIP avvia AVVIA_WINDOWS.bat e usa l’indirizzo mostrato nella finestra. GitHub Pages non esegue il server Python. Il catalogo resta utilizzabile. |
| OLLAMA_OFFLINE | Ollama locale non raggiungibile | Avvia Ollama sul PC e verifica che risponda sulla porta 11434. Il nome del modello deve corrispondere a uno già installato. Per Ollama non serve una chiave API cloud. |
| LOCAL_AUTH | Collegamento al server locale scaduto | Il server potrebbe essere stato riavviato. Esporta prima un JSON di sicurezza, poi ricarica la pagina per ristabilire il collegamento. |
| LOCAL_OFFLINE | Assistente locale non raggiungibile | Controlla che la finestra AVVIA_WINDOWS.bat sia aperta e che tu stia usando il suo indirizzo. Le modifiche in lavoro non risultano confermate su disco. |
| GOOGLE_CLIENT_MISSING | Manca il Client ID Google | Apri Impostazioni e inserisci un Client ID OAuth per applicazione web. Non è una chiave API né un token di accesso. Poi usa Collega Google. |
| GOOGLE_CLIENT_INVALID | Client ID Google non valido | Usa il Client ID OAuth per applicazione web che termina con .apps.googleusercontent.com. Non incollare client secret, API key o access token in questo campo. |
| GOOGLE_CONFIG | Configurazione Google non accettata | In Google Cloud verifica il Client ID web, le origini JavaScript autorizzate e la schermata di consenso. Se il progetto è in test, controlla gli utenti ammessi. |
| GOOGLE_POPUP | Finestra Google bloccata | Consenti i popup per questo sito, poi premi nuovamente Collega Google. Se usi un browser interno a un’altra app, apri Repo Atlas in Chrome o Safari. |
| GOOGLE_CLOSED | Accesso Google interrotto | La finestra di accesso è stata chiusa prima di completare la procedura. Riprova e attendi il ritorno all’app. Nessun backup è stato confermato. |
| GOOGLE_DENIED | Autorizzazione Google non concessa | Accedi con l’account desiderato e concedi i permessi richiesti per Drive o Sheets. Un account gestito potrebbe richiedere l’intervento del suo amministratore. |
| GOOGLE_TOKEN_MISSING | Google non ha restituito un token | La configurazione è presente, ma l’accesso non è completo. Premi Collega Google e completa il consenso. Il token viene ottenuto automaticamente: non devi incollarlo a mano. |
| GOOGLE_EXPIRED | Accesso Google scaduto o revocato | Premi Collega Google e autorizza di nuovo l’app, poi ripeti l’operazione. Il token è temporaneo e non viene incluso nei backup o nei log. |
| GOOGLE_SCOPE | Permessi Google insufficienti | Ripeti il collegamento concedendo il permesso richiesto. Drive e Sheets hanno permessi diversi: autorizzare Drive non basta per esportare in Sheets. |
| GOOGLE_API_DISABLED | API Google non abilitata | Nel progetto Google Cloud del Client ID abilita Google Drive API per i backup e Google Sheets API per i fogli. Attendi l’attivazione e riprova. |
| GOOGLE_FORBIDDEN | Google ha rifiutato l’operazione | Verifica che l’API sia abilitata, i permessi concessi e le regole dell’account. Il codice ricevuto non permette sempre di distinguere queste cause. |
| GOOGLE_RATE | Limite richieste Google raggiunto | Attendi e riprova. Se il problema continua controlla le quote del progetto Google Cloud. |
| GOOGLE_STORAGE | Spazio o limite di archiviazione Google raggiunto | Controlla lo spazio disponibile e i limiti del tuo account Drive. Conserva intanto il backup JSON sul dispositivo. |
| GOOGLE_LIBRARY | Accesso Google non caricato | Controlla Internet e gli eventuali blocchi del browser per accounts.google.com. Poi riprova il collegamento. |
| GOOGLE_VERIFY | Backup Drive non verificato | Il file potrebbe essere stato creato, ma la conferma è incompleta. Controlla Drive prima di riprovare per evitare copie duplicate. Il backup rimane da verificare. |
| SHEETS_PARTIAL | Foglio creato, dati non confermati | Apri Google Sheets e controlla il foglio più recente. La creazione è riuscita, ma il caricamento dei dati è fallito. Esporta intanto un XLSX. |
| GITHUB_AUTH | Token GitHub non accettato | Il token è facoltativo per repository pubblici. Reinserisci un token valido oppure svuota il campo per continuare senza token, con limiti di richieste inferiori. |
| GITHUB_TOKEN_MISSING | Non hai inserito un token GitHub | Per verificarlo incolla il token in Impostazioni. Per usare i repository pubblici puoi anche lasciare il campo vuoto: in quel caso non c’è un token da verificare. |
| GITHUB_NOT_FOUND | Repository non trovato o non accessibile | Controlla proprietario e nome. Un repository privato o senza permessi può apparire come non trovato. Il controllo ZIP di questa app supporta soltanto repository pubblici. |
| GITHUB_RATE | Limite richieste GitHub raggiunto | Attendi il rinnovo del limite oppure aggiungi un token GitHub valido in Impostazioni. Riduci i controlli collettivi. |
| GITHUB_FORBIDDEN | GitHub ha rifiutato l’accesso | Controlla permessi del token e restrizioni del repository. Potrebbe anche essere un limite temporaneo: riprova più tardi. |
| NETWORK | Connessione al servizio non riuscita | Controlla Internet e riprova. Se la rete funziona, un blocco del browser, un firewall o il servizio remoto possono impedire la richiesta. |
| TIMEOUT | Il servizio non ha risposto in tempo | Controlla la connessione e riprova. Con Ollama il primo avvio del modello può essere lento: verifica che il PC abbia memoria sufficiente. |
| SERVICE_UNAVAILABLE | Servizio temporaneamente non disponibile | Attendi e riprova. I dati già salvati nel catalogo restano disponibili. |
| RESPONSE_INVALID | Risposta del servizio non valida | Il servizio ha restituito un formato inatteso. Controlla che il server locale sia aggiornato, poi riprova. |
| SAVE_CONFLICT | Archivio modificato in un’altra finestra | Esporta un JSON di sicurezza. In Backup ed esportazioni usa Ricarica archivio locale; poi riconcilia le modifiche. Il file esistente non viene sovrascritto. |
| FILE_PERMISSION | Permesso di scrittura negato | Consenti l’accesso al file o scegli una cartella scrivibile. Sul PC controlla i permessi della cartella del programma. Il salvataggio non è confermato. |
| DISK_FULL | Spazio su disco esaurito | Libera spazio e ripeti il salvataggio. Se possibile esporta un JSON su un altro supporto. |
| FILE_CANCELLED | Scelta del file annullata | Nessun nuovo file è stato confermato. Riprova Salva file completo quando sei pronto. |
| ARCHIVE_INVALID | Archivio JSON non valido | Scegli un backup JSON prodotto da Repo Atlas. Un Excel, uno ZIP o un file incompleto non può essere importato come archivio. Il catalogo in lavoro resta invariato. |
| ARCHIVE_TOO_LARGE | Archivio oltre i limiti | Il limite è 64 MB e 5000 schede, comprese le immagini. Dividi l’importazione in archivi più piccoli; conserva comunque il backup originale. |
| BROWSER_STORAGE | Copia di emergenza non salvata nel browser | Lo spazio potrebbe essere esaurito o la memorizzazione bloccata. Salva subito un file JSON completo. Non cancellare i dati del sito prima del backup. |
| DRAFT_UNSAVED | Ci sono modifiche da confermare | Salva la scheda o la configurazione aperta prima di continuare. Chiudi la finestra solo se vuoi scartare quelle modifiche. |
| UNKNOWN | Operazione non completata | Non è stato possibile determinare la causa. Esporta il log diagnostico e descrivi quale pulsante hai premuto. Prima di chiudere conserva anche un backup JSON. |
