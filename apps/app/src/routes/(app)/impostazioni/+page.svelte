<!--
  Impostazioni (S2-5) — export JSON/Markdown, versione app, link privacy.

  Local-first: tutto resta sul dispositivo. Export via Blob su web
  (downloadText helper). Versione da package.json (hardcoded allineata).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t, showToast, Panel } from '@lucidme/ui';
  import { exportJSON, exportMarkdown } from '@lucidme/db';
  import { goto } from '$lib/navigation';
  import { getDbClient } from '$lib/db/client.svelte.js';
  import { downloadText } from '$lib/download.js';
  import {
    settingsStore,
    ALARM_SOUNDS,
    isWbtbValid,
    defaultWbtbTime,
  } from '$lib/stores/settings.svelte.js';
  import type { SleepSettings } from '$lib/stores/settings.svelte.js';
  import { isAnalyticsEnabled, setAnalyticsEnabled, track } from '$lib/analytics/index.js';

  // Versione app — allineata a apps/app/package.json (import non disponibile a
  // runtime senza risolvere JSON; usiamo la costante del build).
  const APP_VERSION = '0.0.0';

  let exporting = $state(false);

  // --- Sonno (§S4-2) ---
  // Copia locale editabile, syncata allo store al blur/change.
  let draft = $state<SleepSettings>(settingsStore.current);
  let wbtbError = $state(false);

  const sounds = ALARM_SOUNDS;

  // --- Statistiche anonime (opt-in, S8-3) ---
  let analyticsOn = $state(isAnalyticsEnabled());

  function onAnalyticsToggle(ev: Event): void {
    const target = ev.currentTarget as HTMLInputElement;
    setAnalyticsEnabled(target.checked);
    analyticsOn = target.checked;
  }

  onMount(() => {
    void settingsStore.ensureLoaded().then(() => {
      draft = { ...settingsStore.current };
    });
  });

  function onWbtbToggle(ev: Event): void {
    const target = ev.currentTarget as HTMLInputElement;
    const enabled = target.checked;
    // quando si attiva WBTB, ricalcola il default se vuoto o invalido
    const nextWbtb = enabled ? draft.wbtbTime || defaultWbtbTime(draft.wakeTime) : draft.wbtbTime;
    draft = { ...draft, wbtbEnabled: enabled, wbtbTime: nextWbtb };
    revalidate();
  }

  function onTimeChange(field: 'sleepTime' | 'wakeTime' | 'wbtbTime', ev: Event): void {
    const target = ev.currentTarget as HTMLInputElement;
    draft = { ...draft, [field]: target.value };
    revalidate();
  }

  function onSoundChange(ev: Event): void {
    const target = ev.currentTarget as HTMLSelectElement;
    draft = { ...draft, sound: target.value as SleepSettings['sound'] };
  }

  function revalidate(): void {
    wbtbError = draft.wbtbEnabled && !isWbtbValid(draft);
  }

  async function saveSleep(): Promise<void> {
    revalidate();
    if (wbtbError) {
      showToast(t('notte.wbtb_invalido'));
      return;
    }
    const ok = await settingsStore.save(draft);
    if (ok) {
      showToast(t('impostazioni.sonno_salvato'));
    } else {
      showToast(t('notte.wbtb_invalido'));
    }
  }

  async function exportJson(): Promise<void> {
    if (exporting) return;
    exporting = true;
    try {
      void track('export_used');
      const { dreamRepo, signRepo } = await getDbClient();
      const payload = await exportJSON(dreamRepo, signRepo);
      const ok = downloadText({
        filename: `lucidme-backup-${stamp()}.json`,
        mime: 'application/json',
        text: JSON.stringify(payload, null, 2),
      });
      showToast(ok ? t('impostazioni.esportato_json') : t('impostazioni.esporta_errore'));
    } catch {
      showToast(t('impostazioni.esporta_errore'));
    } finally {
      exporting = false;
    }
  }

  async function exportMd(): Promise<void> {
    if (exporting) return;
    exporting = true;
    try {
      void track('export_used');
      const { dreamRepo } = await getDbClient();
      const dreams = await dreamRepo.listAll();
      const md = exportMarkdown(dreams);
      const ok = downloadText({
        filename: `lucidme-diario-${stamp()}.md`,
        mime: 'text/markdown',
        text: md,
      });
      showToast(ok ? t('impostazioni.esportato_md') : t('impostazioni.esporta_errore'));
    } catch {
      showToast(t('impostazioni.esporta_errore'));
    } finally {
      exporting = false;
    }
  }

  /** Timestamp YYYYMMDD per il nome file. */
  function stamp(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  function back(): void {
    goto('/giardino');
  }
</script>

<svelte:head>
  <title>Impostazioni — Lucid Me</title>
</svelte:head>

<div class="eyebrow">{t('impostazioni.eyebrow')}</div>
<h1>{t('impostazioni.titolo_pre')} <em>{t('impostazioni.titolo_em')}</em></h1>
<p class="sub">{t('impostazioni.sub')}</p>

<!-- ===== Sezione SONNO (§S4-2) ===== -->
<div class="sonno">
  <div class="sonno-eyebrow">{t('impostazioni.sonno_eyebrow')}</div>
  <h2>{t('impostazioni.sonno_titolo')}</h2>
  <p class="sonno-sub">{t('impostazioni.sonno_sub')}</p>

  <label class="field">
    <span class="field-label">{t('impostazioni.sonno_sleep')}</span>
    <input
      type="time"
      value={draft.sleepTime}
      onchange={(e) => onTimeChange('sleepTime', e)}
    />
  </label>

  <label class="field">
    <span class="field-label">{t('impostazioni.sonno_wake')}</span>
    <input
      type="time"
      value={draft.wakeTime}
      onchange={(e) => onTimeChange('wakeTime', e)}
    />
  </label>

  <label class="field toggle">
    <span class="field-label">{t('impostazioni.sonno_wbtb')}</span>
    <input
      type="checkbox"
      checked={draft.wbtbEnabled}
      onchange={onWbtbToggle}
    />
  </label>
  <p class="wbtb-hint">{t('notte.wbtb_hint')}</p>

  {#if draft.wbtbEnabled}
    <label class="field">
      <span class="field-label">{t('impostazioni.sonno_wbtb_time')}</span>
      <input
        type="time"
        value={draft.wbtbTime}
        onchange={(e) => onTimeChange('wbtbTime', e)}
      />
    </label>
    {#if wbtbError}
      <p class="wbtb-error">{t('notte.wbtb_invalido')}</p>
    {/if}

    <label class="field">
      <span class="field-label">{t('impostazioni.sonno_sound')}</span>
      <select value={draft.sound} onchange={onSoundChange}>
        {#each sounds as s}
          <option value={s}>{t(`impostazioni.sound_${s}`)}</option>
        {/each}
      </select>
    </label>
  {/if}

  <button type="button" class="save-btn" onclick={saveSleep}>
    {t('impostazioni.sonno_salva_btn')}
  </button>
</div>

<!-- ===== Sezione ANALYTICS (opt-in, S8-3) ===== -->
<div class="analytics-box">
  <label class="field toggle">
    <span class="field-label">{t('impostazioni.analytics_label')}</span>
    <input
      type="checkbox"
      checked={analyticsOn}
      onchange={onAnalyticsToggle}
    />
  </label>
  <p class="wbtb-hint">{t('impostazioni.analytics_sub')}</p>
</div>

<div class="section">
  <button class="row" type="button" onclick={exportJson} disabled={exporting}>
    <span class="rt">{t('impostazioni.esporta_json')}</span>
    <span class="rs">.json</span>
  </button>
  <button class="row" type="button" onclick={exportMd} disabled={exporting}>
    <span class="rt">{t('impostazioni.esporta_md')}</span>
    <span class="rs">.md</span>
  </button>
</div>

<Panel variant="b2">
  <div class="kv">
    <span class="k">{t('impostazioni.versione')}</span>
    <span class="v">{APP_VERSION}</span>
  </div>
</Panel>

<button class="privacy-link" type="button" onclick={() => goto('/privacy')}>
  {t('impostazioni.privacy_link')}
</button>

<button class="back" type="button" onclick={back}>← {t('nav.giardino')}</button>

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
  .sub {
    color: var(--lm-ink-dim);
    font-size: 14px;
    font-weight: 300;
    margin-top: 12px;
    line-height: 1.5;
    font-family: var(--lm-font-sans);
  }

  .section {
    margin-top: 26px;
    border-top: 1px solid rgba(139, 136, 166, 0.14);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    gap: 12px;
    padding: 17px 6px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(139, 136, 166, 0.14);
    cursor: pointer;
    color: var(--lm-ink);
    font-family: var(--lm-font-sans);
  }
  .row:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .rt {
    font-size: 14.5px;
  }
  .rs {
    font-size: 11.5px;
    color: var(--lm-ink-faint);
    letter-spacing: 0.1em;
  }

  .kv {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-top: 22px;
  }
  .k {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  .v {
    font-family: var(--lm-font-serif);
    font-size: 18px;
    color: var(--lm-ink);
  }

  .privacy-link {
    display: block;
    margin-top: 22px;
    background: none;
    border: none;
    color: var(--lm-cyan);
    border-bottom: 1px dotted rgba(127, 231, 220, 0.4);
    padding: 2px 0;
    font-family: var(--lm-font-sans);
    font-size: 12.5px;
    cursor: pointer;
  }

  .back {
    margin-top: 30px;
    background: none;
    border: none;
    color: var(--lm-ink-faint);
    font-family: var(--lm-font-sans);
    font-size: 13px;
    cursor: pointer;
    letter-spacing: 0.08em;
  }

  /* ===== Sonno (§S4-2) ===== */
  /* `.analytics-box` condivide lo stile pannello del blocco Sonno. */
  .sonno,
  .analytics-box {
    margin-top: 28px;
    padding: 22px 18px;
    border: 1px solid rgba(139, 136, 166, 0.16);
    border-radius: 24px;
    background: rgba(20, 20, 48, 0.32);
  }
  .sonno-eyebrow {
    font-family: var(--lm-font-sans);
    font-size: 10px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  .sonno h2 {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 22px;
    margin: 6px 0 0;
    color: var(--lm-ink);
  }
  .sonno-sub {
    color: var(--lm-ink-dim);
    font-size: 13px;
    font-weight: 300;
    margin: 6px 0 18px;
    line-height: 1.5;
  }
  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(139, 136, 166, 0.12);
    font-family: var(--lm-font-sans);
  }
  .field-label {
    font-size: 13.5px;
    color: var(--lm-ink);
  }
  .field input[type='time'],
  .field select {
    background: rgba(10, 10, 20, 0.6);
    border: 1px solid rgba(139, 136, 166, 0.24);
    border-radius: 10px;
    color: var(--lm-ink);
    font-family: var(--lm-font-sans);
    font-size: 14px;
    padding: 8px 10px;
    outline: none;
  }
  .field.toggle input[type='checkbox'] {
    width: 20px;
    height: 20px;
    accent-color: var(--lm-amber);
  }
  .wbtb-hint {
    font-size: 11.5px;
    color: var(--lm-ink-faint);
    margin: 6px 0 8px;
    line-height: 1.45;
  }
  .wbtb-error {
    font-size: 12px;
    color: #ff9ec6;
    margin: 4px 0 8px;
  }
  .save-btn {
    margin-top: 16px;
    width: 100%;
    padding: 13px;
    border-radius: 50px;
    border: none;
    background: linear-gradient(120deg, rgba(255, 201, 138, 0.9), rgba(255, 158, 198, 0.8));
    color: #1a0f06;
    font-family: var(--lm-font-sans);
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  .save-btn:active {
    transform: scale(0.98);
  }
</style>
