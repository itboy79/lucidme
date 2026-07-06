<!--
  Pagina diagnostica DB (dev only).
  Apre questa pagina in Safari iOS + Chrome Android per verificare che OPFS
  funzioni e i sogni sopravvivano al reload. È il check #1 del local-first.

  Verifica:
   - quale backend è attivo (sqlite-wasm OPFS / kvvfs / stub in memoria)
   - integrità (PRAGMA integrity_check)
   - user_version schema
   - conteggio sogni
   - test scrittura + ricarica (scrivi un sogno di test, ricarica, verifica presenza)
-->
<script lang="ts">
  import { openDb, runMigrations, DreamRepo } from '@lucidme/db';
  import { createDream } from '@lucidme/core';
  import { Button } from '@lucidme/ui';

  let backend = $state<string>('…');
  let integrity = $state<string>('…');
  let dreamCount = $state<number>(-1);
  let status = $state<string>('');
  let persistedOk = $state<boolean | null>(null);

  async function diagnose() {
    status = 'Inizializzazione…';
    try {
      const db = await openDb({ opfs: true });
      backend = (db as unknown as { backend?: string }).backend ?? 'InMemoryDB (stub)';
      await runMigrations(db);
      const repo = new DreamRepo(db);
      const all = await repo.listAll();
      dreamCount = all.length;
      // integrity_check
      try {
        const r = await db.query<{ integrity_check: string }>('PRAGMA integrity_check');
        integrity = r[0]?.integrity_check ?? 'n/d';
      } catch {
        integrity = 'PRAGMA non supportato dal backend';
      }
      status = backend.includes('sqlite-wasm')
        ? '✅ SQLite persistente attivo'
        : '⚠️ Stub in memoria — i dati NON sopravvivono al reload';
    } catch (e) {
      status = '❌ Errore: ' + String(e);
    }
  }

  async function writeTestDream() {
    try {
      const db = await openDb({ opfs: true });
      await runMigrations(db);
      const repo = new DreamRepo(db);
      const dream = createDream({
        body: 'Sogno di test per persistenza DB. Ricarica la pagina: se lo vedi ancora, OPFS funziona.',
        emotion: 'calma',
        lucidity: 0,
      });
      await repo.insert(dream);
      persistedOk = null;
      dreamCount = (await repo.listAll()).length;
      status = `Sogno di test scritto (id=${dream.id}). Sogni totali: ${dreamCount}. RICARICA LA PAGINA per verificare persistenza.`;
    } catch (e) {
      status = '❌ Scrittura fallita: ' + String(e);
    }
  }

  async function checkPersisted() {
    const db = await openDb({ opfs: true });
    const repo = new DreamRepo(db);
    const all = await repo.listAll();
    persistedOk = all.some((d) => d.body.includes('Sogno di test per persistenza DB'));
    dreamCount = all.length;
  }

  $effect(() => {
    void diagnose();
  });
</script>

<svelte:head><title>Diagnostica DB — dev</title></svelte:head>

<div class="diag">
  <h1>Diagnostica DB</h1>
  <p class="hint">Apri questa pagina sul device per verificare che OPFS funzioni.</p>

  <dl>
    <dt>Backend attivo</dt>
    <dd>{backend}</dd>
    <dt>Integrity check</dt>
    <dd>{integrity}</dd>
    <dt>Sogni nel DB</dt>
    <dd>{dreamCount >= 0 ? dreamCount : '…'}</dd>
  </dl>

  <p class="status" class:ok={status.startsWith('✅')} class:warn={status.startsWith('⚠️')} class:err={status.startsWith('❌')}>
    {status}
  </p>

  {#if persistedOk !== null}
    <p class="persisted" class:ok={persistedOk} class:err={!persistedOk}>
      {persistedOk
        ? '✅ Persistenza OK: il sogno di test è sopravvissuto al reload.'
        : "❌ Persistenza FALLITA: il sogno di test non c'è più. OPFS non funziona in questo browser."}
    </p>
  {/if}

  <div class="actions">
    <Button variant="ghost" onclick={() => writeTestDream()}>Scrivi sogno di test</Button>
    <Button variant="ghost" onclick={() => checkPersisted()}>Verifica persistenza</Button>
    <Button variant="ghost" onclick={() => location.reload()}>Ricarica pagina</Button>
  </div>

  <p class="legend">
    Se il backend è <code>sqlite-wasm</code> e la persistenza è OK, il local-first funziona.<br />
    Se è <code>InMemoryDB (stub)</code>, i dati si perdono al reload: contesto non sicuro o browser non supportato.
  </p>
</div>

<style>
  .diag {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 24px;
    font-family: var(--lm-font-sans, system-ui);
    color: var(--lm-ink, #e8e6f2);
  }
  h1 {
    font-family: var(--lm-font-serif, serif);
    font-weight: 340;
    margin: 0 0 8px;
  }
  .hint {
    color: var(--lm-ink-dim, #8b88a6);
    font-size: 13px;
    margin: 0 0 24px;
  }
  dl {
    background: rgba(20, 20, 48, 0.5);
    border-radius: 12px;
    padding: 16px 20px;
    margin: 0 0 16px;
  }
  dt {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--lm-ink-faint, #565370);
    margin-top: 10px;
  }
  dt:first-child {
    margin-top: 0;
  }
  dd {
    margin: 4px 0 0;
    font-family: ui-monospace, monospace;
    font-size: 14px;
  }
  .status {
    padding: 14px 18px;
    border-radius: 12px;
    background: rgba(20, 20, 48, 0.5);
    font-size: 13px;
    margin: 0 0 16px;
  }
  .status.ok {
    color: var(--lm-cyan, #7fe7dc);
  }
  .status.warn {
    color: var(--lm-amber, #ffc98a);
  }
  .status.err {
    color: var(--lm-rose, #ff9ec6);
  }
  .persisted {
    padding: 14px 18px;
    border-radius: 12px;
    background: rgba(20, 20, 48, 0.5);
    font-size: 13px;
    margin: 0 0 16px;
  }
  .persisted.ok {
    color: var(--lm-cyan, #7fe7dc);
  }
  .persisted.err {
    color: var(--lm-rose, #ff9ec6);
  }
  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 0 0 24px;
  }
  .legend {
    color: var(--lm-ink-faint, #565370);
    font-size: 12px;
    line-height: 1.6;
  }
  code {
    background: rgba(127, 231, 220, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
</style>
