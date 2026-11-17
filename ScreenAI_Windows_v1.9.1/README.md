# ScreenAI per Windows — versione 1.9.1

## Correzione della versione 1.9.1

Corretto l'errore di compilazione `CS0136` causato da due variabili locali chiamate `savedPath` nello stesso metodo. Le funzioni della versione 1.9 restano invariate.

## Novità della versione 1.9

La nuova scheda **Configurazione → Uso e salvataggio** permette di:

- avviare ScreenAI automaticamente all'accesso a Windows;
- salvare ogni screenshot in una cartella scelta, per impostazione predefinita `Immagini\ScreenAI`;
- aprire direttamente la cartella degli screenshot;
- disattivare completamente l'analisi IA e usare `Ctrl+Alt+S` come semplice cattura locale.

Con l'IA disattivata ScreenAI non verifica i provider e non invia immagini. Con l'IA attiva puoi decidere separatamente se conservare anche il file PNG. Se usi l'anteprima, viene salvata l'immagine finale con gli eventuali oscuramenti, cioè la stessa versione preparata per l'analisi.

## Novità della versione 1.7

In **Configurazione → Cattura e privacy → Suoni ScreenAI** puoi attivare o disattivare il segnale sonoro riprodotto quando l'analisi è terminata. L'impostazione viene memorizzata e comprende un pulsante **Prova suono**. Le notifiche visive, gli errori e la copia negli appunti continuano a funzionare anche con il suono disattivato.

## Novità della versione 1.6

- avvio automatico facoltativo di Ollama quando il server locale non risponde;
- selezione di `ollama.exe`, utile se Ollama è installato su un disco esterno e non è nel PATH;
- attesa configurabile da 10 a 300 secondi per dischi o modelli lenti;
- riconoscimento dei modelli immagini tramite la capacità `vision` dichiarata da Ollama, non soltanto dal nome;
- comando **Verifica di nuovo i provider**, che aggiorna la sessione dopo aver avviato Ollama o modificato `open.env`;
- nuovo tentativo automatico prima dell'analisi se all'avvio non era disponibile alcuna IA.

Apri **Configurazione → IA e modelli**. Lascia attivo **Avvia Ollama se il server locale non risponde**; se necessario, usa **Sfoglia…** per indicare il vero `ollama.exe`. Poi premi **Verifica ora con queste impostazioni**. ScreenAI non installa né scarica modelli automaticamente.

## Novità della versione 1.5

In **Configurazione → Cattura e privacy** puoi scegliere separatamente:

- **Mostra anteprima e chiedi conferma prima dell'invio**: attivo per impostazione predefinita. Disattivandolo, ogni comando Ctrl+Alt+S, Analizza ora o doppio clic sull'icona invia subito lo screenshot con la domanda salvata, senza conferme né possibilità di oscurare dati. Non esegue catture continue. In modalità multipla possono riceverlo più provider e le eventuali riserve.
- **Mostra la risposta in una finestra**: attivalo per leggere subito la risposta.
- **Copia automaticamente negli appunti**: attivalo per copiare il testo, sostituendo gli appunti precedenti. Puoi usarlo insieme alla finestra o da solo.

Per il funzionamento diretto: disattiva anteprima e finestra risposta, lascia attiva la copia negli appunti e premi **Salva e applica**. La domanda utilizzata è quella salvata; gli errori vengono comunque segnalati. Le preferenze restano memorizzate dopo il riavvio. Mantieni attiva l'anteprima se sullo schermo possono comparire dati sensibili.

## Novità della versione 1.4

- opzione **Interroga più IA** in modalità Auto;
- scelta del numero di provider da interrogare, da 2 a 4;
- richieste simultanee verso provider diversi;
- risposte riunite in un'unica finestra, ma separate e identificate con servizio e modello;
- se le IA verificate sono meno del numero richiesto, vengono usate soltanto quelle disponibili;
- l'anteprima mostra chiaramente a quali servizi verrà inviato lo screenshot.

Apri **Configurazione → IA e modelli**, attiva **In Auto: interroga più IA e confronta le risposte** e scegli il numero. Questa funzione utilizza provider differenti: non invia più volte la richiesta allo stesso servizio. Ollama resta locale; ogni provider cloud riceve una copia dello screenshot e può consumare la propria quota. L'invio richiede conferma solo se l'anteprima è abilitata.

## Novità della versione 1.3

- aggiunto **Ollama locale**, senza chiave API e senza inviare lo screenshot su Internet;
- rilevamento dei modelli visivi Ollama già installati;
- modello Google gratuito predefinito aggiornato a `gemini-3.5-flash-lite`, con `gemini-3.8-flash` e `gemini-3.6-flash` come alternative;
- messaggi diagnostici Gemini più completi;
- lettura di `open.env` tollerante anche a una virgoletta iniziale o finale dimenticata.

Per Ollama è sufficiente che il servizio risponda normalmente su `http://127.0.0.1:11434`; dalla versione 1.6 ScreenAI può anche avviarlo. La posizione dei modelli, anche su un disco esterno, non è importante. Se `ollama.exe` non è nel PATH, selezionalo in Configurazione. ScreenAI non scarica automaticamente modelli. Se non ne trova uno visivo, esegui da terminale:

```powershell
ollama pull qwen3-vl:4b
```

## Nuovo menu Configurazione

Tasto destro sull'icona vicino all'orologio → **Configurazione…**.

**Domande salvate:** scegli una richiesta, modifica il testo e premi **Salva e applica**. La nuova richiesta sostituisce completamente quella iniziale e resta attiva anche dopo il riavvio. Tra i preferiti trovi **Riassunto — massimo 15 righe**, trascrizione, spiegazione, analisi di un errore e traduzione. **Altro…** permette di scrivere una richiesta da zero. Assegna nomi diversi per conservare più domande e richiamarle dall'elenco. **Annulla** scarta le modifiche. La domanda attiva rimane modificabile nell'anteprima.

**IA e modelli:** Auto verifica i servizi configurati e mantiene il più rapido per la sessione. Con **Risposte multiple** disattivato usa una sola IA; attivandolo interroga contemporaneamente da 2 a 4 provider diversi. Ollama locale, Google Gemini, Groq o OpenRouter in modalità specifica usano soltanto il servizio scelto. In Auto puoi decidere se verificare Ollama e se usare le riserve. Una riserva può ricevere lo screenshot dopo l'errore di un servizio che potrebbe averlo già elaborato.

I campi modello sono facoltativi: vuoti = modelli da `open.env` o valori predefiniti; compilati = solo il modello indicato, che deve accettare immagini. Cambiare soltanto domanda o cattura non ripete i test dei servizi. Cambiare servizio, modello o riserva sì.

**Cattura e privacy:** scegli monitor, risoluzione, limite dei token, finestra risposta, copia negli appunti e cronologia. low riduce il lato massimo a 1280 px; auto a 2560 px; high conserva le dimensioni originali. Per leggere testo piccolo consiglio high, purché l'immagine rientri nei limiti del servizio.

Disabilitare la cronologia impedisce nuovi salvataggi ma non cancella quelli già presenti. Puoi aprire la cartella dei dati locali. Il salvataggio PNG degli screenshot è separato dalla cronologia e usa la cartella scelta nella scheda **Uso e salvataggio**. L'ultima risposta resta disponibile in memoria fino all'uscita anche senza appunti e cronologia. L'anteprima con oscuramento e conferma è facoltativa e attiva per impostazione predefinita.

**Verifica servizi → Verifica ora:** esegue un test separato con le scelte del menu, senza cambiare la sessione attiva e senza inviare lo schermo. Per rendere attive le scelte premi **Salva e applica**. Dal menu dell'icona, **Verifica di nuovo i provider** rilegge anche `open.env` e aggiorna la sessione. Ogni modello cloud provato può consumare quota o credito API.

## Aggiornare da una versione precedente

1. Esci dalla vecchia versione dall'icona vicino all'orologio.
2. Estrai questo progetto in una cartella separata, ad esempio `C:\ScreenAI_v1.9`.
3. Avvia `compila-portatile.bat` (richiede .NET 8 SDK e Internet).
4. Sposta il nuovo EXE nella cartella desiderata, mantenendo accanto il tuo `open.env`.

Lo script ora specifica la sorgente ufficiale NuGet e controlla l'effettiva presenza dell'EXE. La gestione DPI è nel progetto, non più nel manifest. Le impostazioni e la cronologia della 1.1 vengono riutilizzate e integrate con le nuove opzioni.

## Test offline opzionali

`verifica-test.bat` esegue test di logica con trasporto HTTP simulato: lettura env, vecchie impostazioni, copia indipendente dei preferiti, conservazione della domanda, capacità vision di Ollama, modalità manuale, Auto, riserva e confronto simultaneo tra tre provider. Nessuna chiave reale o screenshot viene usato. Il ripristino iniziale del progetto test può richiedere Internet.

Questi test non sostituiscono la prova grafica su Windows o la verifica delle tue chiavi. Qui non è disponibile .NET: compilazione e test C# vanno eseguiti sul PC Windows.

ScreenAI cattura lo schermo solo quando premi **Ctrl+Alt+S**, scegli Analizza ora o fai doppio clic sull'icona vicino all'orologio. Se abilitata, l'anteprima permette di controllare l'immagine, modificare la richiesta e trascinare dei rettangoli per oscurare dati sensibili. Altrimenti l'invio è immediato.

## Funzioni

- cattura del monitor corrente oppure di tutti i monitor;
- modalità solo cattura, senza contattare servizi IA;
- salvataggio PNG in `Immagini\ScreenAI` o in una cartella scelta;
- avvio facoltativo con Windows per l'utente corrente;
- anteprima facoltativa prima dell'invio, attiva per impostazione predefinita;
- oscuramento manuale di password, nomi, email o altri dati;
- scelta automatica o manuale del provider con verifica iniziale e riserva opzionale;
- confronto simultaneo delle risposte di 2–4 provider differenti;
- analisi locale tramite Ollama con un modello visivo già installato;
- lettura protetta delle chiavi dal file `open.env` accanto all'EXE;
- richieste preferite e modelli modificabili da Configurazione;
- risposta mostrata a video e copiata negli appunti;
- salvataggio TXT e cronologia locale delle ultime 50 risposte;
- una sola istanza del programma e gestione sicura degli errori;
- stato dei provider consultabile dal menu dell'icona.

Gli screenshot non vengono incorporati nella cronologia: sono file PNG separati nella cartella scelta. La cronologia contiene soltanto richiesta, risposta, data e nome del modello e si trova in `%LOCALAPPDATA%\ScreenAI`.

## Come funziona la scelta automatica

All'avvio ScreenAI cerca `open.env` nella stessa cartella di `ScreenAI.exe`. Per ogni chiave configurata esegue una verifica minima con una piccola immagine di prova. Tra i provider che superano il test sceglie quello più rapido e lo mantiene per tutta la sessione.

Se il provider scelto restituisce un errore durante un'analisi, ScreenAI prova automaticamente le riserve già verificate. Il cambio viene indicato con una notifica.

Provider supportati:

- Ollama locale, senza chiave, tramite l'indirizzo configurabile `http://127.0.0.1:11434`;
- Google Gemini tramite `GOOGLE_API_KEY` o `GEMINI_API_KEY`;
- Groq tramite `GROQ_API_KEY`;
- OpenRouter tramite `OPENROUTER_API_KEY`.

`OPENCODE_API_KEY` viene riconosciuta ma non usata: è destinata all'accesso ai modelli dentro OpenCode e non dispone di un endpoint pubblico documentato adatto a questa funzione.

La verifica iniziale comporta una richiesta API molto piccola per ciascun provider configurato. Potrebbe quindi consumare una quantità minima della relativa quota.

## 1. Requisiti

- Windows 10 o 11 a 64 bit;
- connessione Internet per compilare e per i servizi cloud; non serve durante l'analisi con Ollama locale;
- almeno un modello visivo Ollama installato oppure una chiave valida per Google Gemini, Groq o OpenRouter;
- .NET 8 SDK per compilare.

Per installare .NET 8 SDK, apri **PowerShell** o **Terminale** e scrivi:

```powershell
winget install Microsoft.DotNet.SDK.8
```

Chiudi e riapri il terminale dopo l'installazione.

## 2. Preparare open.env

Metti il tuo file `open.env` nella stessa cartella di `ScreenAI.exe`. Il formato accettato è:

```dotenv
GROQ_API_KEY="la_tua_chiave"
GOOGLE_API_KEY="la_tua_chiave"
OPENROUTER_API_KEY="la_tua_chiave"
OPENCODE_API_KEY="la_tua_chiave"

# Facoltativi per Ollama locale
OLLAMA_ENDPOINT="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen3-vl:4b"
OLLAMA_EXECUTABLE="E:\Ollama\ollama.exe"
```

Non è obbligatorio inserire tutte le chiavi: ScreenAI prova soltanto quelle presenti. Dopo una modifica al file, usa **Verifica di nuovo i provider** dal menu dell'icona oppure riavvia ScreenAI.

Puoi anche specificare un modello diverso:

```dotenv
GROQ_MODEL="qwen/qwen3.8-27b"
GOOGLE_MODEL="gemini-3.5-flash-lite"
OPENROUTER_MODEL="google/gemini-3-flash-preview"
```

Non incollare chiavi nel sorgente, non pubblicare `open.env` su GitHub e non inviarlo ad altre persone. Nel progetto è incluso soltanto `open.env.example`, privo di segreti.

## 3. Compilazione facile

Estrai lo ZIP in una cartella normale. Se vuoi che venga copiato automaticamente, metti il tuo `open.env` nella cartella principale `ScreenAI`, vicino a `compila-portatile.bat`. Poi fai doppio clic su:

```text
compila-portatile.bat
```

Al termine si apre automaticamente la cartella contenente `ScreenAI.exe`. Lo script copia anche `open.env` accanto all'EXE, se lo trova nella cartella principale. Il file EXE è autosufficiente: sul PC di destinazione non serve installare .NET.

Percorso di uscita:

```text
src\ScreenAI\bin\Release\net8.0-windows\win-x64\publish\ScreenAI.exe
```

In alternativa, da PowerShell:

```powershell
dotnet publish .\src\ScreenAI\ScreenAI.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

## 4. Uso

1. Verifica che `open.env` sia accanto a `ScreenAI.exe`.
2. Avvia `ScreenAI.exe`.
3. Trova l'icona di ScreenAI nell'area di notifica di Windows. Se l'IA è attiva, attendi la notifica del provider verificato.
4. Premi **Ctrl+Alt+S**.
5. Se l'IA è attiva e l'anteprima è abilitata, controlla l'immagine e oscura i dati trascinando il mouse, poi premi **Invia all'IA**. Altrimenti lo screenshot viene salvato e, se previsto, inviato subito.
6. Con l'IA attiva la risposta viene mostrata e/o copiata negli appunti secondo le preferenze; in modalità solo cattura compare la conferma del file PNG salvato.

Dal menu dell'icona puoi aprire **Configurazione**, **Verifica di nuovo i provider**, **Ultima risposta**, **Cronologia** oppure uscire.

## Note e risoluzione problemi

- **open.env non rilevato:** deve essere nella stessa cartella dell'EXE, non nella cartella del sorgente.
- **Errore 401/403:** la chiave è errata, revocata, limitata o non autorizzata per quel modello.
- **Google Gemini NO:** apri il testo completo con **Verifica di nuovo i provider**. Se compare `Free tier unavailable`, il problema riguarda l'idoneità del progetto Google e non può essere risolto cambiando modello; se compare chiave bloccata o esposta, generane una nuova in Google AI Studio.
- **Ollama non disponibile:** in Configurazione indica il percorso corretto di `ollama.exe`, aumenta l'attesa se il disco esterno è lento e premi **Verifica ora**. Puoi controllare il server aprendo `http://127.0.0.1:11434/api/tags`. Se nessun modello dichiara la capacità vision, esegui `ollama pull qwen3-vl:4b`.
- **Errore 429:** limite o credito API esaurito, oppure troppe richieste ravvicinate.
- **Tutti i provider non disponibili:** apri **Verifica di nuovo i provider** per vedere il motivo preciso e il modello provato.
- **Ctrl+Alt+S occupato:** usa il doppio clic sull'icona nell'area di notifica.
- **Antivirus/SmartScreen:** un EXE compilato localmente e non firmato può mostrare un avviso. Controlla che provenga dalla cartella compilata da te.
- **Più monitor con coordinate negative:** la cattura usa l'area virtuale di Windows e gestisce correttamente monitor posti a sinistra o sopra quello principale.

## Privacy

Invia soltanto schermate che sei autorizzato a condividere. Lascia attiva l'anteprima per oscurare password, codici, dati sanitari, documenti personali, messaggi privati e informazioni di terzi prima dell'invio. Disattivandola, non potrai controllare o oscurare lo screenshot prima della trasmissione.
# Integrazione Repo Atlas — ScreenAI 1.8

Nuovo menu **Cattura idea per Repo Atlas** e pulsante **Esporta per Repo Atlas** nella finestra dei risultati e in Ultima risposta. Il file .screenai.json contiene l’immagine effettivamente inviata al modello (inclusi oscuramenti), la risposta originale, il prompt, provider, modello e data. Non include le chiavi di open.env.

In Repo Atlas 1.5 usa Screenshot / ScreenAI, importa il file e premi Archivia da valutare. La vecchia cronologia non include immagini: l’esportazione con immagine non è disponibile quando il risultato proviene solo da quella cronologia.

Il limite dell’immagine è 4 MB. Per schermate più grandi usa qualità Auto/Bassa o ritaglia prima di ripetere l’analisi.

Questa consegna include **sorgenti e BAT**, non un nuovo EXE compilato. Esegui compila-portatile.bat su Windows con .NET 8 SDK; riutilizza il tuo open.env accanto all’EXE. I nuovi test del contratto di esportazione sono in verifica-test.bat, ma non sono stati eseguiti in questo ambiente privo di .NET.

