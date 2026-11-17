# Verifica ScreenAI 1.9.1

| Controllo | Stato | Evidenza |
| --- | --- | --- |
| Persistenza nuove opzioni | verificato staticamente | proprietà serializzate e test offline aggiunti |
| Modalità senza IA | verificato staticamente | ramo dedicato prima dell'inizializzazione provider |
| Salvataggio PNG univoco | verificato staticamente | `FileMode.CreateNew` e suffisso progressivo |
| Privacy anteprima | verificato staticamente | salvataggio di `ProcessedImage` dopo oscuramenti |
| Avvio Windows | verificato staticamente | chiave HKCU Run, senza amministratore |
| Errore CS0136 della 1.9 | corretto | rinominata la variabile del ramo solo cattura in `captureOnlyPath` |
| Build .NET e test | da ripetere su Windows | runtime .NET non disponibile nell'ambiente corrente |
| Prova tray, hotkey e finestre | non verificabile qui | richiede Windows interattivo |
