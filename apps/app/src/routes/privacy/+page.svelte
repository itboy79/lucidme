<!--
  /privacy — Informativa privacy reale (local-first, onesta, in italiano).
  Pagina standalone (fuori dal group (app), quindi senza Nav): ritorno tramite
  back button. Stile Organico Generativo: serif per h1, Panel-blob per sezioni,
  max-width 680px, line-height generoso.

  Allineata a wiki §7.3 (bulletproof: local-first, export sempre, E2E opzionale),
  §8.5.4 (privacy by default, scrub dei sogni), §8.5.3 (budget).
-->
<script lang="ts">
  import { goto, withBase } from '$lib/navigation';
  import { Panel, t } from '@lucidme/ui';

  // Data odierna come "ultimo aggiornamento" (formato IT lungo).
  const ultimoAggiornamento = new Date().toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function back(): void {
    goto('/giardino');
  }

  // Sezioni della policy — ogniuna in un Panel organico.
  const sezioni = [
    {
      id: 'dove',
      titolo: 'Dove vivono i tuoi sogni',
      corpo: [
        'Sul tuo dispositivo. Vigilia è un\'app local-first: ogni sogno viene salvato in un database SQLite che risiede nella memoria del tuo telefono o del tuo computer. Non sui nostri server.',
        'Questo significa che puoi scrivere, leggere e rileggere i tuoi sogni anche completamente offline. Nessuna connessione necessaria, nessun account obbligatorio.',
      ],
    },
    {
      id: 'raccolta',
      titolo: 'Cosa raccogliamo',
      corpo: [
        'Di default: niente. Nessun tracker, nessun profilo, nessun contenuto che lascia il dispositivo.',
        'Le analytics sono opzionali e off-opt-in: si attivano solo se tu lo scegli. Sono gestite con PostHog self-hosted e registrano esclusivamente eventi anonimi di utilizzo (per esempio "aperta la sezione Notte"). Il contenuto dei tuoi sogni — testo, titolo, trascrizione vocale — non viene mai raccolto, inviato né analizzato.',
      ],
    },
    {
      id: 'sentry',
      titolo: 'Segnalazioni di crash (Sentry)',
      corpo: [
        'Se l\'app si chiude inaspettatamente, possiamo ricevere una segnalazione tecnica tramite Sentry per capire cosa è andato storto e correggerlo.',
        'Prima di qualsiasi invio applichiamo uno scrub automatico che rimuove sempre i campi che potrebbero contenere testo dei sogni (body, title, transcript e altri). Lo scrub è implementato in packages/core/src/privacy/scrub-fields.ts ed è verificato da test automatici. Mai una riga dei tuoi sogni finisce in un report.',
      ],
    },
    {
      id: 'sync',
      titolo: 'Sincronizzazione (fase futura)',
      corpo: [
        'La sincronizzazione tra più dispositivi è una funzionalità prevista in una fase successiva ed è completamente opzionale.',
        'Quando sarà disponibile, avverrà con cifratura end-to-end lato client (libsodium): il server di sync vedrà soltanto blob cifrati, mai il contenuto in chiaro. Nessuno — noi inclusi — potrà leggere i tuoi sogni. Se preferisci, puoi continuare a usare l\'app in modalità solo-locale per sempre.',
      ],
    },
    {
      id: 'export',
      titolo: 'I tuoi dati, la tua libertà',
      corpo: [
        'Puoi esportare tutti i tuoi sogni in qualsiasi momento in formato JSON o Markdown, anche nel piano gratuito. L\'export è sempre disponibile: è il nostro antidoto al lock-in.',
        'Ti consigliamo di esportare periodicamente come backup personale. Sei il proprietario dei tuoi dati.',
      ],
    },
    {
      id: 'cancellazione',
      titolo: 'Cancellazione',
      corpo: [
        'Puoi eliminare singoli sogni in qualsiasi momento. Per l\'eliminazione completa, l\'app offre una funzione di reset che cancella tutti i dati locali dal dispositivo.',
        'Quando gli account saranno disponibili (fase di sync), l\'eliminazione dell\'account comporterà un wipe verificabile dei dati sui server, in conformità con il diritto alla cancellazione (GDPR, art. 17).',
      ],
    },
    {
      id: 'bambini',
      titolo: 'Bambini e minorenni',
      corpo: [
        'Vigilia è pensato per persone di 13 anni o più. Non raccogliamo l\'età degli utenti.',
      ],
    },
    {
      id: 'contatti',
      titolo: 'Contatti',
      corpo: [
        'Per qualsiasi domanda sulla privacy scrivi a privacy@lucidme.app.',
      ],
    },
  ] as const;
</script>

<svelte:head>
  <title>Vigilia · Privacy</title>
  <meta
    name="description"
    content="Informativa privacy di Vigilia: i tuoi sogni restano sul tuo dispositivo. Local-first, nessuna raccolta di default."
  />
</svelte:head>

<div class="page">
  <button class="back" type="button" onclick={back} aria-label={t('nav.giardino')}>
    ← {t('nav.giardino')}
  </button>

  <header class="header">
    <div class="eyebrow">Privacy</div>
    <h1>I tuoi sogni <em>restano tuoi</em></h1>
    <p class="lede">
      Questa informativa dice in modo diretto dove finiscono i tuoi dati. La versione
      breve: sul tuo dispositivo, non sui nostri server.
    </p>
  </header>

  <div class="sezioni">
    {#each sezioni as s, i (s.id)}
      <Panel variant={i % 3 === 1 ? 'b2' : i % 3 === 2 ? 'b3' : 'b1'}>
        <h2 id={s.id}>{s.titolo}</h2>
        {#each s.corpo as paragrafo}
          <p>{paragrafo}</p>
        {/each}
      </Panel>
    {/each}
  </div>

  <footer class="footer">
    <p>
      Ultimo aggiornamento: <time>{ultimoAggiornamento}</time>
    </p>
    <p class="nota">
      Vigilia è un diario onirico e uno strumento di pratica. Non è una terapia
      medica né un sostituto di pareri professionali. Vedi i <a href={withBase('/termini')}>Termini</a>.
    </p>
  </footer>
</div>

<style>
  .page {
    position: relative;
    min-height: 100dvh;
    padding: 56px 24px 64px;
    background: radial-gradient(120% 90% at 50% -10%, var(--lm-bg2) 0%, var(--lm-bg1) 45%, var(--lm-bg0) 100%);
  }
  /* Colonna centrale stretta e leggibile (max 680px, line-height generoso). */
  .page > * {
    max-width: 680px;
    margin-left: auto;
    margin-right: auto;
  }

  .back {
    background: none;
    border: none;
    color: var(--lm-cyan);
    font-family: var(--lm-font-sans);
    font-size: 13px;
    cursor: pointer;
    letter-spacing: 0.08em;
    padding: 0;
    margin-bottom: 32px;
  }
  .back:hover {
    opacity: 0.8;
  }

  .header {
    margin-bottom: 36px;
  }
  .eyebrow {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  h1 {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 34px;
    line-height: 1.14;
    margin: 8px 0 0;
    letter-spacing: -0.01em;
  }
  h1 em {
    font-style: italic;
    color: var(--lm-violet);
  }
  .lede {
    color: var(--lm-ink-dim);
    font-family: var(--lm-font-sans);
    font-size: 15px;
    font-weight: 300;
    line-height: 1.7;
    margin-top: 18px;
  }

  /* Sezioni: stack di Panel-blob con respiro verticale. */
  .sezioni {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .sezioni :global(h2) {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 19px;
    line-height: 1.25;
    margin: 0 0 10px;
    color: var(--lm-ink);
  }
  .sezioni :global(p) {
    font-family: var(--lm-font-sans);
    font-size: 14.5px;
    font-weight: 300;
    line-height: 1.72;
    color: var(--lm-ink-dim);
    margin: 0;
  }
  .sezioni :global(p + p) {
    margin-top: 10px;
  }

  .footer {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid rgba(182, 156, 255, 0.12);
  }
  .footer p {
    font-family: var(--lm-font-sans);
    font-size: 13px;
    font-weight: 300;
    line-height: 1.7;
    color: var(--lm-ink-faint);
    margin: 0;
  }
  .footer .nota {
    margin-top: 10px;
  }
  .footer a {
    color: var(--lm-cyan);
    text-decoration: none;
  }
  .footer a:hover {
    text-decoration: underline;
  }
</style>
