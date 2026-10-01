# lucidme-server

Server Bun/Elysia di Lucid Me, dal template [bun-full-stack-starter]
(https://github.com/ilbertt/bun-full-stack-starter) ridotto al perimetro utile:
senza auth (l'app è local-first, D-009=A), senza openapi/ws/files. Serve:

- **`/`** — la landing (`apps/site/dist`)
- **`/app/*`** — la PWA (`apps/app/build`, costruita con `KIT_BASE=/app`)
- **`POST /api/waitlist`** — array di email → SQLite (contratto `apps/site/src/waitlist.ts`)
- **`POST /api/feedback`** — array `{text, sentAt}` → SQLite (contratto `apps/app/src/lib/feedback`)
- **`GET /api/health`** — liveness + db

DB: SQLite embedded (`Bun.SQL`), file in `DATA_FOLDER` (default `./data` →
volume persistente su nibrun). Migrazioni embedded, applicate all'avvio in ordine.

## Comandi

```bash
bun install
bun run build:local          # compila per la macchina corrente (test)
BUILD_TARGET=bun-linux-x64 bun run build   # target nibrun (default)
bun run dev                  # da sorgente (richiede public/, vedi build)
bun run check:all            # tsc + biome
```

Il build copia `../apps/site/dist` e `../apps/app/build` dentro `public/` e li
embedda nel binario con le migrazioni: buildare prima i frontend (il workflow
release lo fa).

## Deviazioni dallo starter (documentate)

- Niente better-auth / openapi / websocket / file storage / bun-sqlgen codegen:
  perimetro minuscolo (2 insert), i repository hanno query typed a mano.
- Due alberi frontend (landing + PWA sotto `/app`) invece di una SPA sola.

## Deploy nibrun

`nib run <binario-o-url-release> --name lucidme` — il binario ascolta su `PORT`
(iniettata) e scrive su `./data` (volume persistente).
