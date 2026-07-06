# Stato integrazione SQLite nel browser — ✅ risolto (luglio 2026)

## Cosa FUNZIONA (verificato)

### Node/test (`NodeSqliteDB` via `better-sqlite3`)
- 153 test verdi, FTS5 reale, trigger, transaction rollback, integrity check.
- Path solido e production-ready per CI/test.
- `openDb()` in node lo usa automaticamente.

### Browser (`BrowserSqliteDB` via `@sqlite.org/sqlite-wasm` oo1 API) — ✅ FUNZIONA
- **Persistenza verificata**: roundtrip scrivi→ricarica→verifica SUPERATO (test Playwright, 0 errori).
- Usa l'**oo1 API diretta** (NON l'API Worker1/Promiser, deprecata 2026-04-15).
- `sqlite3InitModule()` è una funzione da chiamare (ritorna Promise<sqlite3>).
- Backend chain: **OpfsDb** (file OPFS) → **DB con `:localStorage:`** (kvvfs via localStorage) → fallback InMemoryDB.

### Core loop verificato end-to-end nel browser
- Onboarding → Alba (scrivi + emozione + pianta) → Giardino (1 sogno) → reload (persiste) → Lume/Sentiero/Notte carichi.
- 0 errori console/pageerror.

## Decisioni tecniche chiave

1. **oo1 API > Promiser API**: la doc ufficiale sconsiglia il Worker1/Promiser per software non-toy. L'oo1 API sul main thread è la via raccomandata e funzionante.
2. **OpfsDb + kvvfs fallback**: OpfsDb richiede secure context (https/localhost). Se non disponibile (es. chromium headless senza cross-origin isolation), cade su kvvfs (`:localStorage:`) — persistente via localStorage, più lento ma funziona ovunque.
3. **`require('better-sqlite3')` in NodeSqliteDB**: import inline via require() per sfuggire al static analysis di Vite (evita che better-sqlite3 finisca nel bundle browser).

## Cosa resta da validare su device fisici (D-7, non bloccante per PWA)

- **OPFS su Safari iOS 17+**: dovrebbe funzionare (secure context + OPFS supportati). Da confermare con la pagina `/dev/db` su iPhone reale. Se OPFS non parte, kvvfs (`:localStorage:`) funziona come fallback persistente.
- **OPFS su Chrome Android**: idem, dovrebbe funzionare via OPFS, fallback kvvfs.
- **Performance**: OPFS è ~10x più veloce di kvvfs. Su device reali preferire OPFS; kvvfs è il plan B.

La pagina diagnostica `/dev/db` (route esentata dalla guard onboarding) permette la validazione in 5 minuti su qualsiasi device: mostra backend attivo, integrity, conteggio sogni, test scrittura+persistenza.

## Architettura `DB`

L'interfaccia `DB { exec(sql, params?); query<T>(sql, params?) }` è stabile. Repos parlano solo con `DB`. Backend-swappable. L'app non sa (né deve sapere) quale backend è attivo — `openDb()` autodetect e fallback robusto.
