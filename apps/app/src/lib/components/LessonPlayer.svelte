<!--
  LessonPlayer.svelte — player delle sessioni guidate del Sentiero (§S3-4).

  Tre modalità, selezionate da `lesson.practice.type`:
    - lettura   → body markdown renderizzato, bottone "Completato" attivo
                 solo dopo scroll-to-bottom (incentivo alla lettura vera);
    - esercizio → step uno alla volta, avanzamento manuale, progress dots;
    - audio     → player HTML5 che punta a `/audio/lessons/<day>.mp3`.
                 Se la traccia manca (HEAD 404), ricade sul testo MAI errore.

  Al completamento: chiama `oncomplete` (che persiste path_progress + toast).
  Stile coerente con il detail overlay del prototipo: backdrop blur, Panel.

  Svelte 5 runes ($props, $state, $derived). Nessun store.
-->
<script lang="ts">
  import type { Lesson } from '@lucidme/content';
  import { t, showToast } from '@lucidme/ui';
  import { renderMarkdown } from '$lib/markdown';
  import { withBase } from '$lib/navigation';

  interface Props {
    lesson: Lesson;
    oncomplete: () => void;
    onclose: () => void;
  }

  let { lesson, oncomplete, onclose }: Props = $props();

  // --- stato esercizio: step corrente ---
  let stepIndex = $state(0);
  const steps = $derived.by(() => lesson.practice.steps);
  const isLastStep = $derived.by(() => stepIndex >= steps.length - 1);

  // --- stato lettura: abilita "Completato" dopo scroll al fondo ---
  let scrolledToBottom = $state(false);
  let bodyEl: HTMLDivElement | null = $state(null);

  function onBodyScroll(): void {
    if (!bodyEl) return;
    // considera "in fondo" con un piccolo margine (32px)
    const distFromBottom =
      bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight;
    if (distFromBottom < 32) scrolledToBottom = true;
  }

  // --- stato audio: detection esistenza traccia ---
  let audioAvailable = $state(true);
  let audioChecked = $state(false);
  let audioEl: HTMLAudioElement | null = $state(null);

  const audioSrc = $derived.by(() => withBase(`/audio/lessons/${lesson.day}.mp3`));

  // Controllo esistenza traccia via HEAD (no errori a UI).
  $effect(() => {
    if (lesson.practice.type !== 'audio') return;
    let cancelled = false;
    fetch(audioSrc, { method: 'HEAD' })
      .then((r) => {
        if (cancelled) return;
        audioAvailable = r.ok;
        audioChecked = true;
      })
      .catch(() => {
        if (cancelled) return;
        audioAvailable = false;
        audioChecked = true;
      });
    return () => {
      cancelled = true;
    };
  });

  // --- completamento ---
  let completed = $state(false);
  function complete(): void {
    if (completed) return;
    completed = true;
    showToast(t('sentiero.toast_completato'));
    oncomplete();
  }

  function advanceStep(): void {
    if (isLastStep) {
      complete();
    } else {
      stepIndex += 1;
    }
  }

  // Il body è HTML sicuro (renderMarkdown escapa l'input controllato).
  const bodyHtml = $derived.by(() => renderMarkdown(lesson.body));
  const sourceLabel = $derived.by(() =>
    lesson.sources.length > 0 ? lesson.sources[0]?.label ?? '' : '',
  );
  // Per l'audio, se non disponibile si mostra il testo (lettura fallback).
  const effectiveType = $derived.by(() =>
    lesson.practice.type === 'audio' && audioChecked && !audioAvailable
      ? 'lettura'
      : lesson.practice.type,
  );
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={lesson.title}>
  <div
    class="backdrop"
    role="button"
    tabindex={-1}
    aria-label="Chiudi"
    onclick={onclose}
    onkeydown={(e) => e.key === 'Escape' && onclose()}
  ></div>

  <div class="panel">
    <button class="close" onclick={onclose} aria-label={t('sentiero.player.chiudi')}>
      {t('sentiero.player.chiudi')}
    </button>

    <div class="title">{lesson.title}</div>
    <div class="meta">
      Giorno {lesson.day} · {lesson.durationMin} min
      {#if sourceLabel}· <span class="src">{t('sentiero.player.fonte')}: {sourceLabel}</span>{/if}
    </div>

    {#if effectiveType === 'audio'}
      <div class="audio-wrap">
        <audio bind:this={audioEl} src={audioSrc} controls preload="metadata"></audio>
        <p class="hint">Premi play e ascolta. Tieni lo schermo acceso.</p>
        <button class="cta alt" onclick={complete}>
          {t('sentiero.player.completato')}
        </button>
      </div>
    {/if}

    {#if effectiveType === 'lettura'}
      <div
        class="body"
        bind:this={bodyEl}
        onscroll={onBodyScroll}
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown statico delle lezioni (bundle nostro, mai user input); sanitizer non richiesto -->
        {@html bodyHtml}
      </div>
      {#if !scrolledToBottom}
        <div class="scroll-hint">{t('sentiero.player.scroll_hint')}</div>
      {/if}
      <button
        class="cta"
        disabled={!scrolledToBottom}
        onclick={complete}
      >
        {t('sentiero.player.completato')}
      </button>
    {:else if effectiveType === 'esercizio'}
      <div class="body esercizio">
        <div class="step-counter">
          {t('sentiero.player.step', undefined, { n: stepIndex + 1, tot: steps.length })}
        </div>
        <p class="step-text">{steps[stepIndex]}</p>
        <div class="dots">
          {#each steps as _step, i}
            <span class="dot" class:done={i <= stepIndex} class:active={i === stepIndex}></span>
          {/each}
        </div>
      </div>
      <button class="cta" onclick={advanceStep}>
        {isLastStep ? t('sentiero.player.completato') : t('sentiero.player.avanti')}
      </button>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fadeIn 0.4s ease;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 5, 12, 0.55);
    backdrop-filter: blur(26px);
    -webkit-backdrop-filter: blur(26px);
  }
  .panel {
    position: relative;
    width: 100%;
    max-width: 480px;
    max-height: 88dvh;
    background: linear-gradient(145deg, rgba(20, 20, 48, 0.96), rgba(10, 10, 20, 0.98));
    border: 1px solid rgba(182, 156, 255, 0.16);
    border-radius: 32px 32px 0 0;
    padding: 28px 24px 32px;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .close {
    position: absolute;
    top: 16px;
    right: 18px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid rgba(139, 136, 166, 0.3);
    background: none;
    color: var(--lm-ink-dim, #8b88a6);
    font-size: 16px;
    cursor: pointer;
  }
  .title {
    font-family: var(--lm-font-serif, serif);
    font-size: 24px;
    font-weight: 340;
    line-height: 1.2;
    margin-bottom: 8px;
    padding-right: 44px;
  }
  .meta {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--lm-ink-faint, #565370);
    margin-bottom: 18px;
  }
  .meta .src {
    color: var(--lm-cyan, #7fe7dc);
    text-transform: none;
    letter-spacing: 0;
  }
  .body {
    overflow-y: auto;
    scrollbar-width: none;
    flex: 1;
    min-height: 180px;
    max-height: 56dvh;
    font-size: 15px;
    font-weight: 300;
    line-height: 1.75;
    color: var(--lm-ink-dim, #8b88a6);
  }
  .body::-webkit-scrollbar {
    display: none;
  }
  .body :global(h1),
  .body :global(h2) {
    font-family: var(--lm-font-serif, serif);
    font-weight: 340;
    color: var(--lm-ink, #e8e6f2);
    margin: 22px 0 10px;
    line-height: 1.25;
  }
  .body :global(h1) {
    font-size: 22px;
  }
  .body :global(h2) {
    font-size: 18px;
  }
  .body :global(p) {
    margin: 0 0 14px;
  }
  .body :global(strong) {
    color: var(--lm-ink, #e8e6f2);
    font-weight: 500;
  }
  .body :global(ul) {
    margin: 0 0 14px;
    padding-left: 18px;
  }
  .body :global(li) {
    margin: 4px 0;
  }
  .scroll-hint {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--lm-ink-faint, #565370);
    text-align: center;
    margin-top: 8px;
    animation: pulse 2.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.9;
    }
  }
  .cta {
    margin-top: 18px;
    padding: 15px;
    border-radius: 60px;
    border: none;
    background: linear-gradient(120deg, var(--lm-violet, #b69cff), var(--lm-cyan, #7fe7dc));
    color: #0a0a14;
    font-family: var(--lm-font-sans, sans-serif);
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  .cta:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .cta:not(:disabled):active {
    transform: scale(0.97);
  }
  .cta.alt {
    margin-top: 14px;
    background: transparent;
    border: 1px solid var(--lm-cyan, #7fe7dc);
    color: var(--lm-cyan, #7fe7dc);
    opacity: 1;
  }
  /* --- esercizio --- */
  .esercizio {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
  }
  .step-counter {
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--lm-cyan, #7fe7dc);
  }
  .step-text {
    font-family: var(--lm-font-serif, serif);
    font-size: 19px;
    font-weight: 340;
    line-height: 1.5;
    color: var(--lm-ink, #e8e6f2);
    max-width: 320px;
  }
  .dots {
    display: flex;
    gap: 8px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(139, 136, 166, 0.3);
  }
  .dot.done {
    background: rgba(127, 231, 220, 0.6);
  }
  .dot.active {
    background: var(--lm-cyan, #7fe7dc);
    box-shadow: 0 0 10px rgba(127, 231, 220, 0.5);
  }
  /* --- audio --- */
  .audio-wrap {
    margin-bottom: 16px;
  }
  .audio-wrap audio {
    width: 100%;
  }
  .hint {
    font-size: 11px;
    color: var(--lm-ink-faint, #565370);
    margin-top: 8px;
    text-align: center;
  }
  @media (prefers-reduced-motion: reduce) {
    .panel,
    .overlay,
    .scroll-hint {
      animation: none;
    }
  }
</style>
