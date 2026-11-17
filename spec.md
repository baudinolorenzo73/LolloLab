# Repo Atlas 1.5.0 — obiettivi

## Estensione 1.5.0 — screenshot e ScreenAI

- Cattura tramite caricamento/incolla di PNG, JPEG o WebP; analisi facoltativa con modello vision configurato; archiviazione senza IA possibile.
- Importazione del formato screenai.repo-atlas versione 1. Conservare immagine inviata al modello, analisi iniziale, prompt, modello/provider e data. Ignorare altri campi, incluse credenziali.
- Schede nella raccolta Schermate da valutare, con stato Da controllare e campi di riutilizzo/progetto già esistenti.
- Conservare l’analisi originale separata da testo corretto, successive analisi e note. Non eseguire istruzioni visibili nelle schermate.
- Sorgenti ScreenAI 1.8: menu dedicato ed esportazione con immagine; cronologia senza immagine non esportabile come falsa cattura.
- Immagini massimo 4 MB; archivio 64 MB; backup schema 3 compatibile in lettura con 1 e 2. Copia browser estesa in IndexedDB e backup JSON portabile completo.
- Log privi di immagini e analisi; screenshot inviati solo dopo azione esplicita. Nessuna compilazione Windows dichiarata senza evidenza.

## Estensione 1.4.0

1. Archivio di idee riutilizzabili: repository GitHub, link web e idee senza fonte; titolo, riutilizzo, progetto collegato e tag ricercabili e persistenti.
2. Distinguere progetti da controllare e miei progetti: questi ultimi sono i repository il cui proprietario coincide con l’account GitHub configurato. Importazione dei repository pubblici senza sostituire schede esistenti.
3. Ripristinare ricerche web e GitHub visibili. Ricerca GitHub in app con archiviazione; ricerca web esterna con istruzioni per conservare il link.
4. Tema scuro/chiaro/sistema salvato. Leggibilità e contrasto per schede, dialoghi, moduli, errori e selezioni.
5. Aggiornamenti dei repository tramite push/commit, base di confronto iniziale e collegamento al confronto. Aggiornamento dell’app distinto, senza ricaricare con modifiche non salvate.
6. Importare schema 1, scrivere schema 2 senza perdere dati precedenti. Il server valida i tipi, gli identificativi e gli URL HTTP/HTTPS; rifiuta schemi pericolosi e credenziali negli URL.
7. IA, verifiche credenziali, log, backup ed esportazioni precedenti restano disponibili. Per idee e web l’IA legge solo il contenuto salvato; nessuna lettura automatica di pagine.

## Estensione 1.3.1 — errori e diagnostica

- Verifica preventiva di modello, chiave IA e Client ID Google. Nessuna chiamata IA se manca un requisito.
- Distinguere i problemi di configurazione, autenticazione, consenso, quota, rete e persistenza; indicare una soluzione concreta.
- Il token Google è ottenuto tramite consenso, resta in memoria e non viene chiesto in un campo manuale. Controllare token assente, scadenza e permessi.
- Esportazione di log JSON tramite pulsanti in errore, impostazioni e backup. Conservare al massimo 300 eventi nel browser; sul server ruotare il file oltre 512 KB mantenendo una copia precedente.
- Escludere dai log chiavi, token, contenuti delle schede, nomi modello, URL, messaggi grezzi dei servizi e stack completi. Includere solo metadati autorizzati; per errori browser includere script noto e numeri di riga/colonna.
- Conservare compatibilità con la versione 1.3.0 e mantenere le sue correzioni.
- Aggiungere verifiche effettive per chiave IA/Ollama, token GitHub e accesso Google tramite richieste in sola lettura; dichiarare i limiti del risultato (nessuna generazione, nessun file creato, credito non garantito).

Base: commit 717885ff5ac7002c39e9579d8e4d7406aada2f01, versione 1.2.0.

1. Conservare seedVersion dopo salvataggio e riapertura: una scheda predefinita eliminata non deve ricomparire.
2. I comandi collettivi richiedono una selezione visibile; cambiare filtro annulla la selezione.
3. Aggiornare GitHub conserva la descrizione personale; la descrizione remota viene conservata separatamente.
4. Mostrare i rapporti di controllo già salvati nel dettaglio.
5. Concludere una sessione con file salvato; Drive può essere richiesto esplicitamente.
6. Separare catalogo, aggiunta, backup/esportazioni e impostazioni. Su telefono mostrare elenco e dettaglio in viste distinte.
7. Conservare compatibilità JSON schema 1, note, README, analisi, configurazione e chiavi escluse dai backup.
8. Consentire di rileggere la revisione locale dopo un conflitto senza aggirare la protezione delle altre finestre.
9. Conservare avvio offline e percorsi relativi per GitHub Pages.

Le API IA, OAuth e download esterni restano soggetti ai servizi reali. Nessuna pubblicazione automatica.
