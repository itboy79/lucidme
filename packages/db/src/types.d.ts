/**
 * Dichiarazione ambientale minima per `wa-sqlite`.
 *
 * `wa-sqlite` è una dipendenza reale (in `package.json`), usata via import
 * dinamico nel path browser di `openDb` (vedi `client.ts`). Questo stub fa
 * passare `tsc --noEmit` quando il pacchetto non è installato (vincolo
 * pipeline: niente `pnpm install` in questo step). A runtime, dopo l'install
 * del parent, il modulo reale sovrascrive questa dichiarazione.
 *
 * L'API concreta di wa-sqlite è ricca; qui tipizziamo solo ciò che `openDb`
 * tocca (un default export con `SQLite3`). L'integrazione OPFS completa vive
 * in `apps/app` (S2-3+).
 */
declare module 'wa-sqlite' {
  const waSqlite: {
    SQLite3: unknown;
  };
  export default waSqlite;
}
