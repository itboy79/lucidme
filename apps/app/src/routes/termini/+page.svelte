<!--
  /termini — Termini di servizio (onesti, in italiano, linguaggio piano).
  Standalone come /privacy: niente Nav, back button al giardino.
  Allineato a wiki §7.8 (claim salute: "pratica"/"diario", mai "terapia")
  e §8.5.5 (claim scientifici con fonte, niente garanzie di risultati).
-->
<script lang="ts">
  import { goto, withBase } from '$lib/navigation';
  import { Panel, t } from '@lucidme/ui';

  const ultimoAggiornamento = new Date().toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function back(): void {
    goto('/giardino');
  }

  const sezioni = [
    {
      id: 'cosa',
      titolo: 'Cos\'è Lucid Me',
      corpo: [
        'Lucid Me è un diario onirico e uno strumento per la pratica dei sogni lucidi. Ti aiuta a registrare i sogni, a seguire un percorso di tecniche (ricordo, reality check, MILD, WBTB, SSILD, TLR) e a osservare i tuoi progressi nel tempo.',
        'È uno strumento personale di pratica e auto-osservazione. Non è una terapia, non è un trattamento medico e non sostituisce in alcun modo il parere di un professionista della salute.',
      ],
    },
    {
      id: 'cosi-com-e',
      titolo: 'Il servizio "così com\'è"',
      corpo: [
        'Lucid Me è offerto "così com\'è", senza garanzie esplicite o implicite. Facciamo del nostro meglio perché sia affidabile e utile, ma non garantiamo che sia privo di errori o adatto a ogni scopo.',
      ],
    },
    {
      id: 'risultati',
      titolo: 'Nessuna garanzia di risultati',
      corpo: [
        'I sogni lucidi non sono assicurati. Le tecniche incluse (MILD, WBTB, SSILD, TLR) hanno un fondamento nella ricerca — ogni lezione cita la fonte — ma i risultati variano molto da persona a persona e dipendono dalla pratica costante.',
        'Presentiamo i contenuti come pratica, non come promessa.',
      ],
    },
    {
      id: 'responsabilita',
      titolo: 'I tuoi dati sono responsabilità tua',
      corpo: [
        'Lucid Me è local-first: i tuoi sogni vivono sul tuo dispositivo. Questo ti dà pieno controllo, ma significa anche che la responsabilità del backup è tua.',
        'Ti consigliamo di esportare periodicamente i tuoi dati (JSON o Markdown, disponibili anche nel piano gratuito). Non siamo responsabili della perdita di dati causata da malfunzionamenti del dispositivo, reset o disinstallazione dell\'app senza backup.',
      ],
    },
    {
      id: 'salute',
      titolo: 'Salute e benessere',
      corpo: [
        'Lucid Me parla di pratica onirica e di sonno, ma non fornisce consigli medici. Se hai disturbi del sonno, condizioni di salute o stai attraversando un momento difficile, rivolgenditi a un professionista qualificato.',
        'Il nostro linguaggio usa "pratica" e "diario", mai "terapia" o "trattamento".',
      ],
    },
    {
      id: 'uso',
      titolo: 'Uso accettabile',
      corpo: [
        'Ti chiediamo di usare l\'app in modo corretto: non cercare di danneggiarla, aggirarne i limiti o usarla per scopi illeciti. I contenuti didattici sono protetti e non possono essere redistribuiti senza autorizzazione.',
      ],
    },
    {
      id: 'modifiche',
      titolo: 'Modifiche dei termini',
      corpo: [
        'Possiamo aggiornare questi termini nel tempo. Ogni modifica significativa sarà comunicata con preavviso, direttamente in app o tramite i canali ufficiale. Continuando a usare Lucid Me dopo le modifiche accetti la versione aggiornata.',
      ],
    },
    {
      id: 'contatti',
      titolo: 'Contatti',
      corpo: ['Per qualsiasi domanda sui termini scrivi a privacy@lucidme.app.'],
    },
  ] as const;
</script>

<svelte:head>
  <title>Lucid Me · Termini</title>
  <meta
    name="description"
    content="Termini di servizio di Lucid Me: diario onirico e strumento di pratica, offerto così com'è, nessuna garanzia di risultati."
  />
</svelte:head>

<div class="page">
  <button class="back" type="button" onclick={back} aria-label={t('nav.giardino')}>
    ← {t('nav.giardino')}
  </button>

  <header class="header">
    <div class="eyebrow">Termini</div>
    <h1>Termini di <em>servizio</em></h1>
    <p class="lede">
      Poche regole chiare. La sintesi: uno strumento di pratica, non una terapia;
      i tuoi dati sono tuoi (e la responsabilità del backup è tua).
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
      Vedi anche l'<a href={withBase('/privacy')}>Informativa privacy</a>.
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
