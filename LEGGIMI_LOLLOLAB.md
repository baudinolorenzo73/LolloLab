# LolloLab 1.10.0

## Novità 1.10.0 — più semplice

- **Menu a 3 voci**: Archivio · API gratuite · Impostazioni e backup. Più il pulsante **+ Aggiungi**, che chiede: idea personale, link web (anche repository GitHub) o foto/screenshot.
- **Cerca nuove idee** (GitHub e web) ora è dentro Archivio, sopra l'elenco.
- **Un solo «💾 Salva»**, sempre visibile in alto: scrive il file completo e, se hai collegato Google, anche la copia su Drive. Sparita la finestra «Salva ed esci».
- **Esportazioni**: JSON (backup), Excel e PDF. Tolti CSV e Google Sheets, che ripetevano Excel.
- Tolti i pulsanti doppi o inutili: 3 modi di aprire Impostazioni, 3 «Esporta log», «Verifica campi salvati», «+ Idea / + Link web / Scatta / Galleria» separati.
- Stessi dati di prima: i backup delle versioni precedenti si aprono senza cambiare nulla.

## Novità 1.9.0 — niente più assistente PC

## Novità 1.9.0 — niente più assistente PC

- Tolti `server.py`, `AVVIA_WINDOWS.bat` e `avvia.sh`: LolloLab è solo browser e PWA.
- **Salvataggio manuale**: il file `.json` lo salvi tu a ogni chiusura con «💾 Salva». Lo stato in alto mostra «○ Da salvare su file» finché non lo fai, e il browser chiede conferma se chiudi con modifiche non salvate. Un vecchio `data/catalogo.json` si apre con «Apri archivio JSON».
- **IA dal browser**: «Spiegami con IA», l'analisi degli screenshot e «Verifica chiave» chiamano direttamente Groq, OpenRouter, OpenAI od Ollama. La chiave resta solo nella sessione. Per Ollama avvialo con OLLAMA_ORIGINS impostato all'indirizzo dell'app.
- Tolto «Scarica e controlla» (controllo dello ZIP del repository): serviva il server.

## Novità 1.8.0 — API gratuite dentro LolloLab

LolloLab e l'app «api» sono diventate una sola app. Nel menu c'è **API gratuite** con due schede:

- **API pubbliche e trekking**: il riepilogo per trekking e GPX (quota, meteo, sentieri, OpenStreetMap) con «▶ Prova ora», e l'elenco di oltre 2000 API pubbliche di public-apis con ricerca, filtri (senza chiave, CORS, HTTPS), preferite e API aggiunte da te. «🔄 Aggiorna da GitHub» scarica l'elenco più recente.
- **API IA gratuite**: i provider di intelligenza artificiale con piano gratuito (modelli, contesto, carta o telefono richiesti), con preferiti e aggiornamento da GitHub.

Su ogni API il pulsante **📌** (o «📌 Archivia») apre «Archivia idea o progetto» già compilato: titolo, link, descrizione, categoria (API e dati, GPX e trekking o IA), tag e note con chiave/CORS/limiti. Premi «Salva nell'archivio» e l'API diventa una scheda da valutare come le altre.

La cartella **ScreenAI_Windows** non è più nel pacchetto: ScreenAI è un programma a parte. LolloLab continua a importare i file `.screenai.json` (menu Screenshot / ScreenAI).

Le preferite, le API tue e gli elenchi aggiornati dell'app «api» si ritrovano da soli, perché tutte le app su baudinolorenzo73.github.io condividono la memoria del browser. Il repository «api» non serve più: puoi lasciarlo o eliminarlo.


LolloLab unisce l'archivio Repo Atlas alle schede di Archivio Idee. Pubblica i file come PWA con Pubblica e usa l’app dal browser. Prima di aggiornare esporta un backup JSON completo dalla versione precedente.

Per raccogliere velocemente un'idea premi «Nuova idea», scrivi il titolo e salva. Link e foto sono facoltativi; «Altri dettagli e valutazione» contiene stato, note, riutilizzo e valutazione. Un link diretto a un repository GitHub inserito in una nuova idea viene riconosciuto automaticamente. Le schede possono essere completate in seguito con «Modifica». Gli screenshot di ScreenAI si importano dal pulsante dedicato.

Per fare presto premi «Scatta e archivia» oppure «Dalla galleria», seleziona una o più immagini e premi «Salva nell’archivio». Il titolo è facoltativo: viene inserito un titolo con data e ora e potrai cambiarlo in seguito. Le foto fino a 20 MB sono accettate; quelle oltre 4 MB vengono ridotte e convertite in JPEG con sfondo bianco. La scelta della fotocamera dipende dal browser e dal dispositivo.

Nel modulo scheda puoi aggiungere fino a 8 immagini JPEG, PNG o WebP, una valutazione, una data da rivedere e il risultato dei test. Il pulsante Duplica crea una nuova idea modificabile. La condivisione Android di testo e link richiede installazione PWA e browser compatibile.

In Backup e esportazioni usa Unisci da JSON per importare un backup di Archivio Idee. Foto incorporate, note, stato, priorità, tag e valutazione vengono convertiti; l'eventuale URL immagine esterno è conservato nelle note. Salva un nuovo backup dopo l'importazione. Ogni importazione di Archivio Idee crea nuove schede: non importare ripetutamente lo stesso file. La data da rivedere è consultabile nella scheda e non invia notifiche.

Il backup completo JSON comprende foto e acquisizioni; Excel e PDF sono esportazioni testuali. Il catalogo totale è limitato a 64 MB. Quando si cambia indirizzo dell'app occorre esportare e importare il backup, perché il browser separa i dati per origine.

Il formato del catalogo è versione 4: Repo Atlas precedente non deve essere usato per aprire e risalvare il nuovo catalogo. ScreenAI 1.8 incluso è sorgente e richiede compilazione; i suoi menu usano ancora il nome Repo Atlas. La versione ScreenAI 1.9.1 è un progetto separato.

GitHub, AI e Drive richiedono connessione e configurazione; l'analisi IA richiede la chiave del provider scelto (Ollama: sul tuo PC). Conserva sempre una copia di backup.
