<!--
  TLRPlayer.svelte — player della sessione TLR (§S4-4).

  Tema notte, progress ring SVG (20 min), stop sempre visibile, contatore cue.
  Marca `night_ritual.tlr_done = true` SOLO se ≥ 15 min completati (callback
  `oncomplete` con flag). Schermo "keep-awake" via Wake Lock quando attivo.

  Svelte 5 runes. Callback props, non event dispatchers.
-->
<script lang="ts">
  import { t, showToast } from '@lucidme/ui';
  import { TLRSession, TLR_TOTAL_MIN, TLR_COMPLETION_MIN } from '$lib/tlr/session.js';
  import { nightStore } from '$lib/stores/night.svelte.js';

  interface Props {
    onclose: () => void;
  }

  let { onclose }: Props = $props();

  let session = $state<TLRSession | null>(null);
  let elapsedMin = $state(0);
  let cueCount = $state(0);
  let running = $state(false);
  let wakeLock: { release: () => Promise<void> } | null = $state(null);

  // Progress ring: raggio + circonferenza per la SVG stroke-dasharray.
  const RADIUS = 84;
  const CIRC = 2 * Math.PI * RADIUS;
  const progress = $derived.by(() => {
    const frac = Math.min(1, elapsedMin / TLR_TOTAL_MIN);
    return CIRC * (1 - frac);
  });

  async function acquireWakeLock(): Promise<void> {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    try {
      wakeLock = await nav.wakeLock.request('screen');
    } catch {
      wakeLock = null;
    }
  }

  async function releaseWakeLock(): Promise<void> {
    try {
      await wakeLock?.release();
    } catch {
      /* no-op */
    }
    wakeLock = null;
  }

  async function start(): Promise<void> {
    session = new TLRSession({ withIntro: true });
    session.onProgress((p) => {
      elapsedMin = p.elapsedMin;
      cueCount = p.cueCount;
      running = p.running;
    });
    await acquireWakeLock();
    await session.start();
    running = true;
  }

  async function stop(): Promise<void> {
    if (!session) {
      onclose();
      return;
    }
    const completed = session.isCompleted();
    await releaseWakeLock();
    session.stop();
    running = false;
    if (completed) {
      // marca tlr_done = true nel rituale di oggi
      try {
        await nightStore.markTlrDone();
        showToast(t('notte.tlr.completato'));
      } catch {
        showToast(t('notte.tlr.errore'));
      }
    } else {
      showToast(t('notte.tlr.interrotto', undefined, { min: String(elapsedMin) }));
    }
    onclose();
  }

  // Cleanup se l'utente chiude la pagina a sessione attiva.
  $effect(() => {
    return () => {
      if (session && running) {
        session.stop();
        void releaseWakeLock();
      }
    };
  });
</script>

<div class="overlay night" role="dialog" aria-modal="true" aria-label={t('notte.tlr.titolo')}>
  <div
    class="backdrop"
    role="button"
    tabindex={-1}
    aria-label="Chiudi"
    onclick={stop}
    onkeydown={(e) => e.key === 'Escape' && stop()}
  ></div>

  <div class="panel">
    <div class="title">{t('notte.tlr.titolo')}</div>
    <div class="meta">{t('notte.tlr.sub')}</div>

    <div class="ring-wrap">
      <svg viewBox="0 0 200 200" class="ring">
        <circle class="track" cx="100" cy="100" r="84" />
        <circle
          class="progress"
          cx="100"
          cy="100"
          r="84"
          stroke-dasharray={CIRC}
          stroke-dashoffset={progress}
        />
      </svg>
      <div class="ring-center">
        <div class="min">{elapsedMin}<span class="u">/ {TLR_TOTAL_MIN}</span></div>
        <div class="lbl">{t('notte.tlr.minuti')}</div>
      </div>
    </div>

    <div class="cue-counter">
      {t('notte.tlr.cue', undefined, { n: cueCount })}
    </div>

    <div class="threshold-hint">
      {t('notte.tlr.soglia', undefined, { min: String(TLR_COMPLETION_MIN) })}
    </div>

    {#if !running && elapsedMin === 0}
      <button class="cta" onclick={start}>{t('notte.tlr.inizia')}</button>
    {/if}
    <button class="cta stop" onclick={stop}>{t('notte.tlr.ferma')}</button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.4s ease;
  }
  .overlay.night {
    background: radial-gradient(100% 80% at 50% 110%, rgba(255, 201, 138, 0.07), transparent 60%);
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(4, 4, 8, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .panel {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: linear-gradient(160deg, rgba(20, 16, 30, 0.96), rgba(8, 6, 12, 0.98));
    border: 1px solid rgba(255, 201, 138, 0.16);
    border-radius: 28px;
    padding: 30px 26px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .title {
    font-family: var(--lm-font-serif, serif);
    font-size: 24px;
    font-weight: 340;
    color: var(--lm-notte-title, #f4e9dc);
  }
  .meta {
    font-size: 12px;
    color: var(--lm-ink-faint, #565370);
    margin-top: 6px;
    margin-bottom: 18px;
  }
  .ring-wrap {
    position: relative;
    width: 200px;
    height: 200px;
  }
  .ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .track {
    fill: none;
    stroke: rgba(255, 201, 138, 0.12);
    stroke-width: 6;
  }
  .progress {
    fill: none;
    stroke: var(--lm-amber, #ffc98a);
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s linear;
    filter: drop-shadow(0 0 8px rgba(255, 201, 138, 0.4));
  }
  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .min {
    font-family: var(--lm-font-serif, serif);
    font-size: 48px;
    font-weight: 300;
    color: var(--lm-amber, #ffc98a);
    line-height: 1;
  }
  .min .u {
    font-size: 16px;
    color: var(--lm-ink-faint, #565370);
  }
  .lbl {
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint, #565370);
    margin-top: 6px;
  }
  .cue-counter {
    margin-top: 18px;
    font-size: 12px;
    color: var(--lm-ink-dim, #8b88a6);
    letter-spacing: 0.08em;
  }
  .threshold-hint {
    margin-top: 8px;
    font-size: 11px;
    color: var(--lm-ink-faint, #565370);
  }
  .cta {
    margin-top: 20px;
    width: 100%;
    padding: 15px;
    border-radius: 60px;
    border: none;
    background: linear-gradient(120deg, rgba(255, 201, 138, 0.9), rgba(255, 158, 198, 0.8));
    color: #1a0f06;
    font-family: var(--lm-font-sans, sans-serif);
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  .cta:active {
    transform: scale(0.97);
  }
  .cta.stop {
    background: transparent;
    border: 1px solid rgba(255, 201, 138, 0.4);
    color: var(--lm-amber, #ffc98a);
  }
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .panel {
      animation: none;
    }
  }
</style>
