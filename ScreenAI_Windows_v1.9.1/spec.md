# Specifica ScreenAI 1.9.1

## Risultato atteso

Rendere ScreenAI utilizzabile come strumento residente di cattura, anche senza analisi IA.

## Requisiti

1. L'utente può abilitare l'avvio automatico all'accesso a Windows.
2. L'utente può salvare gli screenshot e scegliere la cartella; il valore iniziale è `Immagini\ScreenAI`.
3. L'utente può disattivare l'IA: in questo caso non vengono verificati provider né inviate immagini.
4. In modalità senza IA `Ctrl+Alt+S`, doppio clic e menu salvano un PNG locale.
5. Con IA e anteprima, il PNG salvato contiene gli stessi oscuramenti applicati prima dell'invio.
6. Le impostazioni precedenti, i prompt, i provider, la cronologia e Repo Atlas restano compatibili.

## Casi limite

- IA disattivata e salvataggio disattivato: configurazione rifiutata perché non produrrebbe alcun risultato.
- Cartella inesistente: viene creata al primo salvataggio o con il pulsante Apri.
- Nome già esistente: viene aggiunto un suffisso numerico.
- Provider non disponibile: se richiesto, lo screenshot viene comunque salvato prima del messaggio diagnostico.

## Criteri di accettazione

- Le nuove opzioni sopravvivono al riavvio.
- L'avvio automatico usa la chiave Run dell'utente corrente e viene rimosso quando disattivato.
- I PNG hanno nome con data e ora e non sovrascrivono file esistenti.
- Nessuna richiesta di rete viene avviata in modalità solo cattura.
