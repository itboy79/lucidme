# Stato integrazione SQLite nel browser — onesto (luglio 2026)

## Cosa FUNZIONA (verificato)

- **Node/test** (`NodeSqliteDB` via `better-sqlite3`): 153 test verdi, FTS5 reale,
  trigger, transaction rollback, integrity check. Path solido e production-ready
  per CI/test. `openDb()` in node lo usa automaticamente.
- **Architettura `DB`**: l'interfaccia è stabile. Repos parlano solo con `DB`,
  backend-swappable. Lo stub `InMemoryDB` resta come fallback ultimo.
- **L'app carica nel browser**: better-sqlite3 non viene più caricato (require()
  sfugge al static analysis di Vite), routes renderizzano, nav funziona.

## Cosa NON FUNZIONANCIA ancora (debt)

- **`BrowserSqliteDB` (sqlite-wasm via promiser)**: il worker si avvia, il DB si
  "apre" (`status: ✅ SQLite persistente attivo`), MA:
  - `runMigrations` non crea le tabelle nel path browser (l'`exec` multi-statement
    DDL non funziona via promiser API come scritto).
  - Di conseguenza `repo.insert` throwa (tabella `dream` non esiste).
  - Il test di persistenza fallisce.

- **Root cause ipotizzata**: l'API `sqlite3Worker1Promiser` ha una semantica
  specifica per `exec` con resultRows/bind/columnNames che non matcha il mio uso.
  La doc ufficiale (https://sqlite.org/wasm/doc/trunk/md-1-promise.md) va studiata
  e l'integrazione va iterata con DevTools aperti in un browser reale.

- **OPFS in Chromium headless**: richiede cross-origin isolation (COOP/COEP headers)
  non disponibile nel test Playwright di default. In un browser REALE (Safari iOS 17+,
  Chrome Android recente, installata come PWA) OPFS è disponibile senza header
  speciali. Il fallback kvvfs (IndexedDB) dovrebbe funzionare ovunque.

## Cosa fare (ticket: debt DB-browser)

1. Fixare `BrowserSqliteDB.exec`/`query` per matchare la semantica del promiser:
   - `exec` per DDL multi-statement → usare `type: 'exec'` con sql stringa, NON
     con bind (sqlite-wasm exec non binda).
   - `query` per SELECT → `type: 'exec'` con `resultRows: []`, leggere `result.rows`.
2. Validare su Safari iOS 17+ e Chrome Android (device fisici).
3. Se OPFS non parte in un target critico, kvvfs è il fallback di produzione.
4. Aggiornare questa sezione con i risultati della matrice device.

## Intanto

L'app è usabile in dev/preview anche con DB stub (i dati non persistono tra reload,
ma il core loop UI funziona). Per la beta serve il punto 1-2 sopra.
