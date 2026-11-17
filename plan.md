# Piano

Estensione 1.5.0: captures.js gestisce importazione e archiviazione; browser-draft.js conserva grandi copie di emergenza in IndexedDB. server.py valida immagini incorporate e prepara richieste vision ai provider già configurati. ScreenAI esporta un contratto JSON indipendente dalle credenziali; nessun collegamento HTTP automatico fra le app. Aggiornamento schema 3 e controlli di compatibilità/salvataggio.

Estensione 1.4.0: model.js gestisce tipi e appartenenza; appearance.js applica il tema prima del caricamento dell’interfaccia; discovery.js gestisce ricerca, importazione dei repository pubblici e aggiornamento app. app.js mantiene catalogo, persistenza, editor ed esportazioni. Migrazione incrementale schema 1 → 2 con nuovi campi; nessuna dipendenza aggiunta. Ricerca GitHub tramite API ufficiale e ricerca web in scheda esterna.

Estensione 1.3.1: catalogo errori in errors.js; log ed esportazione in diagnostics.js; stato configurazione e consenso Google; classificazione degli errori remoti lato Python senza inoltrare messaggi che possono contenere chiavi. Test simulati di tutte le nuove condizioni e dei metadati esportati; nessuna chiamata con credenziali reali.

- Correggere la validazione Python preservando seedVersion e descrizione remota.
- Separare selezione collettiva ed esportazioni, mantenere il backup completo indipendente dai filtri.
- Introdurre filtro per stato, navigazione e vista mobile del dettaglio; spostare i CSS in styles.css.
- Correggere ripristino della copia browser e aggiungere rilettura del file locale.
- Aggiornare cache, documentazione e versione senza eliminare dati applicativi.
- Verificare salvataggi, conflitti, filtri, descrizioni, rapporti, uscita e riavvio offline con test mirati.
