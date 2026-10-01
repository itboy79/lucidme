<!--
  Notte — rituale serale (§S4-1).

  Tre gesti come da prototipo (intenzione MILD, training TLR, ripasso sign).
  Ogni tap toggle + persiste immediatamente via NightRepo. I dream sign nel
  terzo gesto vengono da `detectSigns(dreamsStore.list)` (sign reali).

  Card WBTB: mostra l'orario programmato (da impostazioni) + copy ONESTO sulla
  affidabilità (sul web la sveglia funziona solo se l'app resta aperta).

  Il secondo gesto apre il TLRPlayer (§S4-4) invece di toggolare subito.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t, showToast } from '@lucidme/ui';
  import { can, detectSigns } from '@lucidme/core';
  import type { SignHit } from '@lucidme/core';
  import { goto, withBase } from '$lib/navigation';
  import { dreamsStore } from '$lib/stores/dreams.svelte.js';
  import { nightStore } from '$lib/stores/night.svelte.js';
  import { settingsStore } from '$lib/stores/settings.svelte.js';
  import { getAlarmBackend } from '$lib/alarm/index.js';
  import { scheduleWBTB, cancelWBTB, getScheduled } from '$lib/alarm/scheduler.js';
  import { track } from '$lib/analytics/index.js';
  import { entitlementStore } from '$lib/entitlements.svelte.js';
  import TLRPlayer from '$lib/components/TLRPlayer.svelte';

  let showTlr = $state(false);
  let scheduled = $state<Date | null>(null);

  // Sign reali dal diario (≥3 occorrenze). Reactive sui sogni caricati.
  const signs = $derived.by<SignHit[]>(() => detectSigns(dreamsStore.list));
  const signsLabel = $derived.by(() =>
    signs.length > 0
      ? signs.slice(0, 5).map((s) => s.label).join(' · ')
      : t('notte.ritual_3_no_signs'),
  );

  const sleep = $derived.by(() => settingsStore.current);

  onMount(() => {
    void entitlementStore.ensureLoaded();
    void nightStore.ensureLoaded();
    void settingsStore.ensureLoaded();
    void dreamsStore.ensureLoaded();
    void refreshScheduled();
  });

  async function refreshScheduled(): Promise<void> {
    // Se è già in memoria nello scheduler, usalo; altrimenti null.
    scheduled = getScheduled();
  }

  async function toggleMild(): Promise<void> {
    await nightStore.toggleMild();
    showToast(t('notte.ritual_done'));
  }

  async function toggleSigns(): Promise<void> {
    await nightStore.toggleSigns();
    showToast(t('notte.ritual_done'));
  }

  // Gating S8-1: il training TLR è Pro (`path_full`, matrice S8-1). Il tap
  // sul gesto apre il paywall invece del player. (L'evento `paywall_viewed`
  // lo emette l'onMount di /pro: mai duplicarlo qui — review finding #1.)
  function openTlr(): void {
    if (!can('path_full', entitlementStore.tier)) {
      void goto('/pro');
      return;
    }
    showTlr = true;
  }

  // --- WBTB scheduling ---
  async function toggleWbtb(): Promise<void> {
    const backend = await getAlarmBackend();
    if (scheduled) {
      await cancelWBTB(backend);
      scheduled = null;
      void track('wbtb_dismissed');
      showToast(t('notte.disattiva'));
      return;
    }
    // Calcola la data del prossimo WBTB (oggi o domani).
    const [wh, wm] = sleep.wbtbTime.split(':').map(Number);
    const now = new Date();
    const at = new Date();
    at.setHours(wh ?? 5, wm ?? 0, 0, 0);
    if (at.getTime() <= now.getTime()) {
      // già passato per oggi → programma per domani
      at.setDate(at.getDate() + 1);
    }
    try {
      await scheduleWBTB(at, backend, {
        sound: withBase(`/audio/alarms/${sleep.sound}.mp3`),
        vibrate: true,
        title: t('notte.wbtb_card_lbl'),
        body: t('notte.rientro'),
      });
      scheduled = at;
      // Semantica onesta (review #5): l'evento conta la PROGRAMMAZIONE,
      // non lo scocciare — chi cancella prima non deve gonfiare la metrica.
      void track('wbtb_scheduled');
      showToast(
        t('notte.wbtb_programmato', undefined, {
          time: sleep.wbtbTime,
        }),
      );
      // Copy onesto sul web
      if (!backend.reliable) {
        showToast(t('notte.pwa_limite'));
      }
    } catch {
      showToast(t('notte.wbtb_invalido'));
    }
  }
</script>

<svelte:head>
  <title>Notte — Lucid Me</title>
</svelte:head>

<div class="eyebrow notte">{t('notte.eyebrow')}</div>
<h1 class="notte">{t('notte.titolo_pre')} <em>{t('notte.titolo_em')}</em></h1>
<p class="sub">{t('notte.sub_vuoto')}</p>

<div class="rituals">
  <!-- Gesto 1: Intenzione MILD -->
  <button
    type="button"
    class="ritual"
    class:done={nightStore.mildDone}
    onclick={toggleMild}
    aria-label={t('notte.ritual_1')}
  >
    <span class="dot">☾</span>
    <span class="body">
      <span class="rt">{t('notte.ritual_1')}</span>
      <span class="rs">{t('notte.ritual_1_sub')}</span>
    </span>
  </button>

  <!-- Gesto 2: Training TLR (apre il player) -->
  <button
    type="button"
    class="ritual"
    class:done={nightStore.tlrDone}
    onclick={openTlr}
    aria-label={t('notte.ritual_2')}
  >
    <span class="dot">♒</span>
    <span class="body">
      <span class="rt">{t('notte.ritual_2')}</span>
      <span class="rs">{t('notte.ritual_2_sub')}</span>
    </span>
  </button>

  <!-- Gesto 3: Ripassa dream sign (sign reali) -->
  <button
    type="button"
    class="ritual"
    class:done={nightStore.signsDone}
    onclick={toggleSigns}
    aria-label={t('notte.ritual_3')}
  >
    <span class="dot">✶</span>
    <span class="body">
      <span class="rt">{t('notte.ritual_3')}</span>
      <span class="rs">{t('notte.ritual_3_sub', undefined, { signs: signsLabel })}</span>
    </span>
  </button>
</div>

<!-- Card WBTB -->
<button type="button" class="wbtb-card" onclick={toggleWbtb}>
  <div class="wbtb-lbl">{t('notte.wbtb_card_lbl')}</div>
  {#if scheduled}
    <div class="wbtb-time">{sleep.wbtbTime}</div>
    <div class="wbtb-rs">{t('notte.wbtb_card_sound', undefined, { sound: sleep.sound })}</div>
    <div class="wbtb-action">{t('notte.disattiva')}</div>
  {:else}
    <div class="wbtb-time off">{sleep.wbtbTime}</div>
    <div class="wbtb-rs">{t('notte.wbtb_card_off')}</div>
    <div class="wbtb-action">{t('notte.programma')}</div>
  {/if}
</button>

{#if showTlr}
  <TLRPlayer onclose={() => (showTlr = false)} />
{/if}

<style>
  .eyebrow {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  .eyebrow.notte {
    color: var(--lm-notte-eyebrow);
  }
  h1 {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 34px;
    line-height: 1.12;
    margin: 8px 0 0;
  }
  h1.notte {
    color: var(--lm-notte-title);
  }
  h1 em {
    font-style: italic;
    color: var(--lm-amber);
  }
  .sub {
    color: var(--lm-ink-dim);
    font-size: 14px;
    font-weight: 300;
    margin-top: 8px;
    line-height: 1.5;
  }

  .rituals {
    margin-top: 22px;
    border-top: 1px solid rgba(139, 136, 166, 0.14);
    display: block;
    width: 100%;
  }
  .ritual {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    text-align: left;
    padding: 17px 6px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(139, 136, 166, 0.14);
    cursor: pointer;
    color: var(--lm-ink);
    font-family: var(--lm-font-sans);
  }
  .ritual .dot {
    width: 34px;
    height: 34px;
    flex: none;
    border-radius: 50%;
    border: 1px solid rgba(255, 201, 138, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--lm-amber);
    font-size: 13px;
    transition: all 0.4s;
  }
  .ritual.done .dot {
    background: radial-gradient(circle at 35% 30%, rgba(255, 201, 138, 0.5), rgba(255, 201, 138, 0.12));
    box-shadow: 0 0 14px rgba(255, 201, 138, 0.3);
  }
  .ritual .body {
    display: flex;
    flex-direction: column;
  }
  .ritual .rt {
    font-size: 14.5px;
  }
  .ritual .rs {
    font-size: 11.5px;
    color: var(--lm-ink-faint);
    margin-top: 2px;
    max-width: 240px;
    line-height: 1.4;
  }
  .ritual.done .rt {
    color: var(--lm-ink-faint);
    text-decoration: line-through;
    text-decoration-color: rgba(255, 201, 138, 0.4);
  }

  .wbtb-card {
    margin-top: 26px;
    width: 100%;
    padding: 24px 18px;
    border: 1px solid rgba(255, 201, 138, 0.18);
    border-radius: 32px;
    background: radial-gradient(circle at 50% 30%, rgba(255, 201, 138, 0.08), transparent 70%);
    cursor: pointer;
    color: var(--lm-ink);
    text-align: center;
    font-family: var(--lm-font-sans);
  }
  .wbtb-lbl {
    font-size: 11px;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  .wbtb-time {
    font-family: var(--lm-font-serif);
    font-size: 52px;
    font-weight: 300;
    color: var(--lm-amber);
    letter-spacing: 0.02em;
    margin-top: 4px;
  }
  .wbtb-time.off {
    color: var(--lm-ink-faint);
    opacity: 0.5;
  }
  .wbtb-rs {
    font-size: 11.5px;
    color: var(--lm-ink-faint);
    margin-top: 6px;
  }
  .wbtb-action {
    margin-top: 12px;
    font-size: 12px;
    color: var(--lm-amber);
    border-bottom: 1px dotted rgba(255, 201, 138, 0.4);
    display: inline-block;
    padding-bottom: 1px;
  }
</style>
