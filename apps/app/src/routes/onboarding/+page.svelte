<!--
  Onboarding primo avvio (S8-2) — 4 schermate fullscreen + primo sogno guidato.

  Slide:
    1. Benvenuto: eyebrow + h1 "Benvenutə in *Lucid Me*" + value prop + CTA "Inizia".
    2. Come funziona: 3 mini-card (Alba / Sentiero / Giardino) in Panel blob + "Avanti".
    3. Notifiche (pre-prompt S8-2): spiegazione valore + "Sì, attiva" che richiede
       il permesso SOLO al tap; "Non ora" avanza senza toccare l'API Notification
       (non si "brucia" il prompt di sistema).
    4. Primo sogno guidato: EmotionPicker (required) + LucidityPicker + TextEntry
       + "Pianta il primo sogno" + ghost "Non ricordo il sogno" (noRecall: body
       vuoto ammesso, lucidity forzata a 0). Al save: markCompleted() + goto('/giardino').

  Navigazione: tap sulle CTA per avanzare; swipe orizzontale (touch) avanti/indietro;
  indicatore a 4 punti (tap per saltare a una slide già vista); link "Salta" in basso
  a destra → markCompleted() + goto('/giardino').

  Visual = Organico Generativo: dark, titoli Fraunces serif, blob Panel, accenti
  violet/cyan. Starfield dietro (montato nel layout radice).
-->
<script lang="ts">
  import {
    t,
    Button,
    Panel,
    EmotionPicker,
    LucidityPicker,
    TextEntry,
    showToast,
  } from '@lucidme/ui';
  import { createDream } from '@lucidme/core';
  import type { Dream, Emotion, Lucidity } from '@lucidme/core';
  import { goto } from '$app/navigation';
  import { onboardingStore } from '$lib/stores/onboarding.svelte.js';
  import { dreamsStore } from '$lib/stores/dreams.svelte.js';
  import { getDbClient } from '$lib/db/client.svelte.js';
  import { track } from '$lib/analytics/index.js';

  // ---- Stato slide ----
  // step 0 = benvenuto, 1 = come funziona, 2 = notifiche, 3 = primo sogno.
  const TOTAL = 4;
  let step = $state(0);
  // Massima slide raggiunta: i puntini oltre questa sono disabilitati (non si
  // salta avanti senza vedere). Si può sempre tornare indietro.
  let furthest = $state(0);

  function go(toStep: number): void {
    if (toStep < 0 || toStep >= TOTAL) return;
    step = toStep;
    if (toStep > furthest) furthest = toStep;
  }

  function next(): void {
    go(step + 1);
  }

  // ---- Swipe orizzontale (touch) ----
  let touchStartX = 0;

  function onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    touchStartX = touch ? touch.clientX : 0;
  }

  function onTouchEnd(e: TouchEvent): void {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartX;
    const THRESHOLD = 50;
    if (dx < -THRESHOLD && step < TOTAL - 1) {
      next();
    } else if (dx > THRESHOLD && step > 0) {
      go(step - 1);
    }
  }

  // ---- Skip ----
  let finishing = $state(false);

  async function finishToGarden(): Promise<void> {
    if (finishing) return;
    finishing = true;
    void track('onboarding_completed');
    try {
      await onboardingStore.markCompleted();
    } catch {
      /* best-effort */
    }
    await goto('/giardino');
  }

  // ---- Slide notifiche (pre-prompt S8-2) ----
  // Il permesso viene richiesto SOLO al tap esplicito su "Sì, attiva": il
  // bottone "Non ora" non tocca mai Notification.requestPermission, così il
  // prompt di sistema non viene bruciato in caso di rinvio.
  async function enableNotifications(): Promise<void> {
    try {
      if (typeof Notification !== 'undefined') await Notification.requestPermission();
    } catch {
      /* headless/vecchi browser: prosegui comunque */
    }
    next();
  }

  // ---- Primo sogno (slide 4) ----
  let emotion = $state<Emotion | null>(null);
  let lucidity = $state<Lucidity>(1);
  let body = $state('');
  let planting = $state(false);

  // Bottone "Pianta" (e "Non ricordo il sogno") abilitato solo con emozione
  // scelta (come Alba).
  const canPlant = $derived(emotion !== null && !planting && !finishing);

  // Flusso condiviso tra plant normale e "Non ricordo il sogno": persistenza
  // best-effort + toast + completamento onboarding. Se il backend SQLite non
  // è disponibile (es. test headless senza cross-origin isolation), lo stato
  // locale del dream store viene comunque aggiornato e l'onboarding viene
  // marcato completato.
  async function plantCommon(dream: Dream): Promise<void> {
    try {
      const { dreamRepo } = await getDbClient();
      await dreamRepo.insert(dream);
      dreamsStore.add(dream);
    } catch {
      /* DB non disponibile: l'onboarding va comunque a buon fine */
    }
    showToast(t('alba.toast_piantato'));
    void track('dream_saved', { has_voice: false, lucidity: dream.lucidity });
    await completeOnboarding();
  }

  // Chiusura condivisa con il path "Salta": evento anonimo + flag onboarding
  // + navigazione al giardino.
  async function completeOnboarding(): Promise<void> {
    void track('onboarding_completed');
    try {
      await onboardingStore.markCompleted();
    } catch {
      /* best-effort */
    }
    planting = false;
    await goto('/giardino');
  }

  async function plant(): Promise<void> {
    if (planting || emotion === null) return;
    if (body.trim() === '') {
      showToast(t('alba.errore_body'));
      return;
    }
    planting = true;
    // createDream può lanciare VALIDATION: in tal caso si salta il plant ma
    // l'onboarding viene comunque completato (comportamento storico).
    try {
      await plantCommon(createDream({ body: body.trim(), emotion, lucidity }));
    } catch {
      await completeOnboarding();
    }
  }

  // "Non ricordo il sogno" (S8-2): entry noRecall con body vuoto ammesso e
  // lucidity forzata a 0 dal dominio; l'emozione resta obbligatoria (canPlant).
  async function plantNoRecall(): Promise<void> {
    if (planting || emotion === null) return;
    planting = true;
    try {
      await plantCommon(createDream({ body: '', emotion, lucidity: 0, noRecall: true }));
    } catch {
      await completeOnboarding();
    }
  }

  // Ricalcolo del titolo/eyebrow per slide (indice 3 = primo sogno).
  const titles = [
    {
      pre: t('onboarding.slide1_titolo_pre'),
      em: t('onboarding.slide1_titolo_em'),
    },
    null,
    null, // slide 3 (notifiche): titolo semplice, senza em.
    {
      pre: t('onboarding.slide3_titolo_pre'),
      em: t('onboarding.slide3_titolo_em'),
    },
  ] as const;
</script>

<svelte:head>
  <title>{t('onboarding.slide1_eyebrow')}</title>
</svelte:head>

<section
  class="onb"
  aria-label={t('onboarding.aria_root')}
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
>
  <!-- Slide 1 — Benvenuto -->
  {#if step === 0}
    <div class="slide slide-welcome">
      <div class="eyebrow">{t('onboarding.slide1_eyebrow')}</div>
      <h1 class="title">
        {titles[0].pre} <em>{titles[0].em}</em>
      </h1>
      <p class="sub">{t('onboarding.slide1_sub')}</p>
      <Button variant="primary" onclick={next}>{t('onboarding.inizia')}</Button>
    </div>
  {:else if step === 1}
    <!-- Slide 2 — Come funziona -->
    <div class="slide slide-how">
      <div class="eyebrow">{t('onboarding.slide1_eyebrow')}</div>
      <h1 class="title">{t('onboarding.slide2_titolo')}</h1>

      <div class="cards">
        <Panel variant="b1">
          <div class="card-t">{t('onboarding.slide2_alba_t')}</div>
          <div class="card-d">{t('onboarding.slide2_alba_d')}</div>
        </Panel>
        <Panel variant="b2">
          <div class="card-t">{t('onboarding.slide2_sentiero_t')}</div>
          <div class="card-d">{t('onboarding.slide2_sentiero_d')}</div>
        </Panel>
        <Panel variant="b3">
          <div class="card-t">{t('onboarding.slide2_giardino_t')}</div>
          <div class="card-d">{t('onboarding.slide2_giardino_d')}</div>
        </Panel>
      </div>

      <Button variant="primary" onclick={next}>{t('onboarding.avanti')}</Button>
    </div>
  {:else if step === 2}
    <!-- Slide 3 — Notifiche (pre-prompt S8-2) -->
    <div class="slide slide-notif">
      <div class="eyebrow">{t('onboarding.slide1_eyebrow')}</div>
      <h1 class="title">{t('onboarding.notif_titolo')}</h1>
      <p class="sub">{t('onboarding.notif_sub')}</p>

      <Button variant="primary" onclick={enableNotifications}>
        {t('onboarding.notif_attiva')}
      </Button>
      <Button variant="ghost" onclick={next}>{t('onboarding.notif_dopo')}</Button>
    </div>
  {:else}
    <!-- Slide 4 — Primo sogno guidato -->
    <div class="slide slide-dream">
      <div class="eyebrow">{t('onboarding.slide1_eyebrow')}</div>
      <h1 class="title">
        {titles[3].pre} <em>{titles[3].em}</em>
      </h1>
      <p class="sub">{t('onboarding.slide3_sub')}</p>

      <div class="field-label">{t('alba.emozione_label')}</div>
      <EmotionPicker value={emotion} onchange={(e: Emotion) => (emotion = e)} />

      <div class="field-label">{t('alba.lucidita_label')}</div>
      <LucidityPicker value={lucidity} onchange={(v: Lucidity) => (lucidity = v)} />

      <div class="field-label">{t('alba.body_label')}</div>
      <TextEntry
        bind:value={body}
        placeholder={t('alba.body_placeholder')}
        ariaLabel={t('alba.body_label')}
      />

      <Button variant="primary" disabled={!canPlant} onclick={plant}>
        {t('onboarding.slide3_primo')}
      </Button>
      <Button variant="ghost" disabled={!canPlant} onclick={plantNoRecall}>
        {t('onboarding.non_ricordo')}
      </Button>
    </div>
  {/if}

  <!-- Indicatore a 4 punti -->
  <div class="dots" role="tablist" aria-label={t('onboarding.aria_dots')}>
    {#each Array(TOTAL) as _, i (i)}
      <button
        type="button"
        role="tab"
        class="dot"
        class:on={step === i}
        aria-selected={step === i}
        aria-label={t('onboarding.aria_slide', undefined, { n: i + 1, total: TOTAL })}
        disabled={i > furthest}
        onclick={() => go(i)}
      ></button>
    {/each}
  </div>

  <!-- Salta -->
  <button type="button" class="skip" onclick={finishToGarden} disabled={finishing}>
    {t('onboarding.salta')}
  </button>
</section>

<style>
  .onb {
    position: relative;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  .slide {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    animation: slideIn 0.5s var(--lm-ease) both;
  }
  /* Slide 2 allinea in alto (lista di card). */
  .slide-how {
    justify-content: flex-start;
    padding-top: 8px;
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .slide {
      animation: none;
    }
  }

  .eyebrow {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  .title {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 36px;
    line-height: 1.12;
    margin: 10px 0 0;
  }
  .title em {
    font-style: italic;
    color: var(--lm-violet);
  }
  .sub {
    color: var(--lm-ink-dim);
    font-size: 15px;
    font-weight: 300;
    margin-top: 16px;
    line-height: 1.6;
    font-family: var(--lm-font-sans);
    max-width: 32ch;
  }

  /* ---- Slide 2: card ---- */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 22px 0 8px;
  }
  :global(.cards .card-t) {
    font-family: var(--lm-font-serif);
    font-size: 19px;
    font-weight: 400;
    margin-bottom: 4px;
  }
  :global(.cards .card-d) {
    font-size: 13.5px;
    color: var(--lm-ink-dim);
    line-height: 1.55;
    font-weight: 300;
    font-family: var(--lm-font-sans);
  }

  /* ---- Slide 4: form primo sogno ---- */
  .field-label {
    display: block;
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin: 22px 0 12px;
  }

  /* ---- Indicatore a 4 punti ---- */
  .dots {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 18px;
    padding-bottom: 8px;
  }
  .dot {
    width: 8px;
    height: 8px;
    padding: 0;
    border-radius: 50%;
    border: none;
    background: rgba(139, 136, 166, 0.35);
    cursor: pointer;
    transition: all 0.4s var(--lm-ease);
  }
  .dot.on {
    background: var(--lm-cyan);
    box-shadow: 0 0 10px rgba(127, 231, 220, 0.5);
    transform: scale(1.25);
  }
  .dot:disabled {
    cursor: default;
    opacity: 0.5;
  }

  /* ---- Salta ---- */
  .skip {
    position: absolute;
    right: 0;
    bottom: 4px;
    background: none;
    border: none;
    color: var(--lm-ink-faint);
    font-family: var(--lm-font-sans);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 6px 4px;
    transition: color 0.3s var(--lm-ease);
  }
  .skip:hover {
    color: var(--lm-cyan);
  }
  .skip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
