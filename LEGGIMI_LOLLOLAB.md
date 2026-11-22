# LolloLab 1.8.1

LolloLab unisce l'archivio Repo Atlas alle schede di Archivio Idee. Avvia AVVIA_WINDOWS.bat su PC, oppure pubblica i file come PWA. Prima di aggiornare esporta un backup JSON completo dalla versione precedente.

Le analisi IA si avviano dalla scheda con «Analizza con IA»; «Configura IA» apre il provider e il modello. Ollama usa il modello installato sul PC senza chiave; Verifica elenca i modelli locali. OpenRouter propone `openrouter/free`, un router gratuito soggetto ai limiti del proprio account e alla disponibilità dei modelli. Groq ha un piano gratuito con limiti specifici per account e modello; OpenAI API può avere costi. Le chiavi restano in memoria per la sessione. L'analisi delle schede con foto usa la prima immagine e il testo salvato, annotando quando sono presenti altre foto; quella delle idee testuali propone sintesi, tag, categoria e un passo successivo senza modificare automaticamente la scheda. Le analisi richiedono l'assistente PC avviato con AVVIA_WINDOWS.bat anche quando si usa un'API cloud: la versione GitHub Pages su telefono non analizza senza questo assistente.

La vista iniziale «Da organizzare» mostra le schede con stato Da controllare, più recenti per prime. Scrivi nella casella «Annota adesso» e premi «Archivia subito»: la nota completa viene conservata e il titolo usa la prima riga. Puoi incollare anche un link. «Scatta foto» e «Scegli foto» archiviano direttamente una scheda, con la nota già scritta se presente; la fotocamera o la galleria possono essere annullate senza creare schede. Per classificare una scheda, aprila e premi «Modifica»: cambiando stato sparisce da «Da organizzare», ma resta nell’archivio. Controlla periodicamente «Backup ed esportazioni» per salvare un JSON completo.

Per raccogliere velocemente un'idea premi «Nuova idea», scrivi il titolo e salva. Link e foto sono facoltativi; «Altri dettagli e valutazione» contiene stato, note, riutilizzo e valutazione. Un link diretto a un repository GitHub inserito in una nuova idea viene riconosciuto automaticamente. Le schede possono essere completate in seguito con «Modifica». Gli screenshot di ScreenAI si importano dal pulsante dedicato.

Per fare presto premi «Scatta foto» oppure «Scegli foto»: dopo la selezione le immagini sono archiviate automaticamente. Il titolo è facoltativo: viene inserito un titolo con data e ora e potrai cambiarlo in seguito. Le foto fino a 20 MB sono accettate; quelle oltre 4 MB vengono ridotte e convertite in JPEG con sfondo bianco. La scelta della fotocamera dipende dal browser e dal dispositivo.

Nel modulo scheda puoi aggiungere fino a 8 immagini JPEG, PNG o WebP, una valutazione, una data da rivedere e il risultato dei test. Il pulsante Duplica crea una nuova idea modificabile. La condivisione Android di testo e link richiede installazione PWA e browser compatibile.

In Backup e esportazioni usa Unisci da JSON per importare un backup di Archivio Idee. Foto incorporate, note, stato, priorità, tag e valutazione vengono convertiti; l'eventuale URL immagine esterno è conservato nelle note. Salva un nuovo backup dopo l'importazione. Ogni importazione di Archivio Idee crea nuove schede: non importare ripetutamente lo stesso file. La data da rivedere è consultabile nella scheda e non invia notifiche.

Il backup completo JSON comprende foto e acquisizioni; CSV, fogli e PDF sono esportazioni testuali. Il catalogo totale è limitato a 64 MB. Quando si cambia indirizzo dell'app occorre esportare e importare il backup, perché il browser separa i dati per origine.

Il formato del catalogo è versione 4: Repo Atlas precedente non deve essere usato per aprire e risalvare il nuovo catalogo. ScreenAI 1.8 incluso è sorgente e richiede compilazione; i suoi menu usano ancora il nome Repo Atlas. La versione ScreenAI 1.9.1 è un progetto separato.

GitHub, AI e Drive richiedono connessione e configurazione; l'analisi IA e il controllo ZIP richiedono l'assistente su PC. Conserva sempre una copia di backup.
