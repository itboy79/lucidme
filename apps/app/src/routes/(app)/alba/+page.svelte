<!--
  Alba — schermata di cattura del sogno (S2-3).

  Layout fedele al prototipo (righe 140-154):
   - eyebrow "Alba · appena svegliə", h1 "Cosa hai *sognato*?"
   - canvas preview organismo (animato, vive con emozione/lucidità correnti)
   - bottone rec "tieni premuto e racconta" (Web Speech API it-IT, feature-detected)
   - campo titolo (facoltativo) + body TextEntry (auto-resize)
   - EmotionPicker (REQUIRED), LucidityPicker (slider 0-3)
   - "Pianta nel giardino" (disabled se emozione mancante)

  Comportamenti:
   - Draft autosave → localStorage `lucidme:draft:alba`, debounce 300ms,
     ripristinato al mount, pulito al save riuscito.
   - Edit mode (?edit=<id>): carica il sogno dal DB (via load), salva con update.
   - Save → createDream → dreamRepo.insert → dreamsStore.add → toast → /giardino?new=<id>.
-->
<script lang="ts">
  import {
    t,
    EmotionPicker,
    LucidityPicker,
    TextEntry,
    Button,
    showToast,
  } from '@lucidme/ui';
  import { createDream, DomainError } from '@lucidme/core';
  import type { Emotion, Lucidity, Dream } from '@lucidme/core';
  import { renderFrame } from '@lucidme/generative';
  import type { OrganismParams } from '@lucidme/generative';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { dreamsStore } from '$lib/stores/dreams.svelte.js';
  import { getDbClient } from '$lib/db/client.svelte.js';
  import { fitCanvas, observeResize } from '$lib/canvas.js';
  import {
    createRecognizer,
    speechSupported,
    transcriptFromEvent,
  } from '$lib/speech.js';
  import type {
    MinimalSpeechRecognition,
    SpeechRecognitionResultEventLike,
  } from '$lib/speech.js';

  let { data } = $props<{ data: { editDream: Dream | null } }>();

  // Il sogno di partenza (edit mode) è letto UNA volta per inizializzare il form;
  // le modifiche successive sono guidate dall'utente, non dal load. `untrack`
  // cattura il valore iniziale senza sottoscrivere la reattività (init-once).
  const initialDream = untrack(() => data.editDream);

  // ---- Stato del form ----
  // Emozione default: NESSUNA (ticket S2-3 punto 3). Solo in edit mode ereditiamo.
  let emotion = $state<Emotion | null>(initialDream?.emotion ?? null);
  let lucidity = $state<Lucidity>(initialDream?.lucidity ?? 1);
  let title = $state<string>(initialDream?.title ?? '');
  let body = $state<string>(initialDream?.body ?? '');

  const isEdit = $derived(data.editDream !== null);
  const eyebrow = $derived(isEdit ? t('alba.edit_eyebrow') : t('alba.eyebrow'));
  const plantLabel = $derived(isEdit ? t('alba.plant_btn_salva') : t('alba.plant_btn_crea'));

  // ---- Draft autosave (localStorage) ----
  const DRAFT_KEY = 'lucidme:draft:alba';
  const DEBOUNCE_MS = 300;
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  let draftRestored = false;

  function saveDraft(): void {
    // In edit mode NON salviamo nel draft (stiamo modificando un sogno esistente):
    // il draft è solo per la creazione nuova, altrimenti al riavvio sovrascriverebbe.
    if (isEdit) return;
    try {
      const payload = JSON.stringify({ title, body, emotion, lucidity });
      localStorage.setItem(DRAFT_KEY, payload);
    } catch {
      /* private mode / quota: silenzioso */
    }
  }

  // Debounce 300ms sull'autosave del draft.
  $effect(() => {
    // Tocca i valori per re-run.
    void title;
    void body;
    void emotion;
    void lucidity;
    if (!draftRestored) return;
    if (draftTimer !== undefined) clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, DEBOUNCE_MS);
    return () => {
      if (draftTimer !== undefined) clearTimeout(draftTimer);
    };
  });

  // Ripristina il draft al mount (solo se NON siamo in edit mode e c'è un draft).
  $effect(() => {
    if (draftRestored || isEdit) {
      draftRestored = true;
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          title?: string;
          body?: string;
          emotion?: Emotion;
          lucidity?: Lucidity;
        };
        if (typeof parsed.title === 'string') title = parsed.title;
        if (typeof parsed.body === 'string') body = parsed.body;
        if (
          typeof parsed.emotion === 'string' &&
          ['calma', 'meraviglia', 'gioia', 'paura', 'malinconia', 'desiderio'].includes(parsed.emotion)
        ) {
          emotion = parsed.emotion as Emotion;
        }
        if (
          typeof parsed.lucidity === 'number' &&
          parsed.lucidity >= 0 &&
          parsed.lucidity <= 3
        ) {
          lucidity = parsed.lucidity as Lucidity;
        }
        if (body !== '' || emotion !== null) {
          showToast(t('alba.draft_ripristinato'));
        }
      }
    } catch {
      /* parse/JSON error: ignora */
    }
    draftRestored = true;
  });

  function clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* no-op */
    }
  }

  // ---- Voice dictation (hold-to-record) ----
  const voiceSupported = speechSupported();
  let recording = $state(false);
  let recognizer: MinimalSpeechRecognition | null = null;
  let lastResultIndex = 0;

  function startRecording(): void {
    if (!voiceSupported) return;
    const rec = createRecognizer();
    if (!rec) return;
    recognizer = rec;
    lastResultIndex = 0;
    rec.onresult = (e: SpeechRecognitionResultEventLike) => {
      const text = transcriptFromEvent(e, lastResultIndex);
      if (text) {
        // append al body, con separatore se serve
        const sep = body.length > 0 && !body.endsWith(' ') ? ' ' : '';
        body = body + sep + text + ' ';
        lastResultIndex = e.results.length;
      }
    };
    rec.onend = () => {
      recording = false;
    };
    rec.onerror = () => {
      recording = false;
    };
    try {
      rec.start();
      recording = true;
    } catch {
      recording = false;
    }
  }

  function stopRecording(): void {
    if (recognizer) {
      try {
        recognizer.stop();
      } catch {
        /* no-op */
      }
      recognizer = null;
    }
    recording = false;
  }

  // ---- Preview canvas (organismo live) ----
  let previewCanvas: HTMLCanvasElement | undefined = $state();
  let raf = 0;

  const previewParams = $derived.by<OrganismParams>(() => ({
    // seed variabile con emozione: così cambia aspetto quando si sceglie l'emozione
    seed: `preview:${emotion ?? 'null'}`,
    emotion: (emotion ?? 'meraviglia') as Emotion,
    lucidity: lucidity,
  }));

  $effect(() => {
    if (!previewCanvas) return;
    const c = previewCanvas;
    fitCanvas(c);
    const handle = observeResize(c, (el) => fitCanvas(el));
    const loop = (time: number) => {
      const ctx = c.getContext('2d');
      const rect = c.getBoundingClientRect();
      if (ctx) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        const r = 52 + lucidity * 8;
        renderFrame(ctx, previewParams, rect.width / 2, rect.height / 2, r, time);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      handle.disconnect();
    };
  });

  // Ferma il riconoscitore quando si lascia la pagina.
  $effect(() => {
    return () => {
      stopRecording();
    };
  });

  // ---- Salvataggio ----
  let saving = $state(false);

  async function plant(): Promise<void> {
    if (saving) return;
    if (!emotion) {
      showToast(t('alba.errore_emozione'));
      return;
    }
    if (body.trim() === '') {
      showToast(t('alba.errore_body'));
      return;
    }
    saving = true;
    try {
      const { dreamRepo } = await getDbClient();
      if (isEdit && initialDream) {
        // Edit: ricostruisci il Dream con i nuovi campi, seed/createdAt immutabili.
        const base = initialDream;
        const updated: Dream = {
          ...base,
          title,
          body,
          emotion,
          lucidity,
        };
        await dreamRepo.update(updated);
        dreamsStore.upsert(updated);
        showToast(t('alba.toast_aggiornato'));
        await goto(`/giardino?new=${encodeURIComponent(base.id)}`);
      } else {
        const dream = createDream({ title, body, emotion, lucidity });
        await dreamRepo.insert(dream);
        dreamsStore.add(dream);
        clearDraft();
        showToast(t('alba.toast_piantato'));
        await goto(`/giardino?new=${encodeURIComponent(dream.id)}`);
      }
    } catch (err) {
      if (err instanceof DomainError) {
        showToast(t('alba.errore_generico'));
      } else {
        showToast(t('alba.errore_generico'));
      }
    } finally {
      saving = false;
    }
  }
</script>

<div class="eyebrow">{eyebrow}</div>
<h1>{t('alba.titolo_pre')} <em>{t('alba.titolo_em')}</em>?</h1>

<div class="rec-wrap">
  <canvas bind:this={previewCanvas} class="preview" aria-hidden="true"></canvas>
  {#if voiceSupported}
    <button
      class="rec-btn"
      class:recording
      type="button"
      aria-label={t('alba.rec_label')}
      onpointerdown={startRecording}
      onpointerup={stopRecording}
      onpointerleave={stopRecording}
      onpointercancel={stopRecording}
    >
      <span class="rec-dot">●</span>
    </button>
    <div class="rec-label">
      {recording ? t('alba.rec_ascolto') : t('alba.rec_label')}
    </div>
  {/if}
</div>

<div class="field-label">{t('alba.titolo_input_label')}</div>
<input
  class="title-input"
  type="text"
  bind:value={title}
  placeholder={t('alba.titolo_placeholder')}
  maxlength="80"
  aria-label={t('alba.titolo_input_label')}
/>

<div class="field-label">{t('alba.body_label')}</div>
<TextEntry
  bind:value={body}
  placeholder={t('alba.body_placeholder')}
  ariaLabel={t('alba.body_label')}
/>

<div class="field-label">{t('alba.emozione_label')}</div>
<EmotionPicker value={emotion} onchange={(e: Emotion) => (emotion = e)} />

<div class="field-label">{t('alba.lucidita_label')}</div>
<LucidityPicker value={lucidity} onchange={(v: Lucidity) => (lucidity = v)} />

<Button variant="primary" disabled={!emotion || saving} onclick={plant}>
  {plantLabel}
</Button>

<style>
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
    line-height: 1.12;
    margin: 8px 0 0;
  }
  h1 em {
    font-style: italic;
    color: var(--lm-violet);
  }

  /* `.rec-wrap` + `.rec-btn` + `.rec-label` (righe 51-56 prototipo). */
  .rec-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 12px;
  }
  .preview {
    width: 190px;
    height: 190px;
  }
  .rec-btn {
    margin-top: 2px;
    width: 74px;
    height: 74px;
    border-radius: 50%;
    border: 1px solid rgba(255, 158, 198, 0.5);
    background: radial-gradient(
      circle at 35% 30%,
      rgba(255, 158, 198, 0.3),
      rgba(255, 158, 198, 0.08)
    );
    color: var(--lm-rose);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: recPulse var(--lm-keyframe-rec-pulse, 4000ms) ease-in-out infinite;
    transition: transform 0.3s var(--lm-ease);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .rec-btn:active {
    transform: scale(0.92);
  }
  .rec-btn.recording {
    background: radial-gradient(
      circle at 35% 30%,
      rgba(255, 158, 198, 0.55),
      rgba(255, 158, 198, 0.2)
    );
    box-shadow: 0 0 0 8px rgba(255, 158, 198, 0.18);
    animation: none;
  }
  .rec-dot {
    font-size: 22px;
    line-height: 1;
  }
  @keyframes recPulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(255, 158, 198, 0.25);
    }
    50% {
      box-shadow: 0 0 0 22px rgba(255, 158, 198, 0);
    }
  }
  .rec-label {
    margin-top: 12px;
    font-size: 12px;
    letter-spacing: 0.18em;
    color: var(--lm-ink-dim);
    text-transform: uppercase;
    font-family: var(--lm-font-sans);
  }

  .field-label {
    display: block;
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin: 26px 0 12px;
  }

  /* Titolo input — coerente con TextEntry ma singola riga. */
  .title-input {
    width: 100%;
    background: rgba(20, 20, 48, 0.4);
    border: 1px solid rgba(139, 136, 166, 0.3);
    border-radius: 18px;
    padding: 14px 16px;
    color: var(--lm-ink);
    font-family: var(--lm-font-serif);
    font-size: 17px;
    font-weight: 340;
    outline: none;
    transition: border-color 0.3s var(--lm-ease);
  }
  .title-input:focus {
    border-color: rgba(127, 231, 220, 0.5);
  }
  .title-input::placeholder {
    color: var(--lm-ink-faint);
    font-family: var(--lm-font-sans);
    font-size: 14px;
    font-weight: 300;
  }

  @media (prefers-reduced-motion: reduce) {
    .rec-btn {
      animation: none;
    }
  }
</style>
