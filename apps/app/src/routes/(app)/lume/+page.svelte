<!--
  Lume (Step 6) — metriche e progresso.
  TUTTI i calcoli sono in @lucidme/core (computeWeekly, lucidityRate, lucidityDelta,
  currentStreak, recallScoreForWeek, detectSigns). Il componente renderizza soltanto.

  Layout dal prototipo (righe 173-192): eyebrow + h1, metrica grande, trend, signs, tris.
  Stati: < 7 giorni di dati → "pochi dati" (nessun numero grande deprimente).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t, Panel, TrendChart, Button } from '@lucidme/ui';
  import {
    can,
    computeWeekly,
    lucidityRate,
    lucidityDelta,
    currentStreak,
    recallScoreForWeek,
    detectSigns,
    mondayOf,
    addDays,
    toDateStr,
  } from '@lucidme/core';
  import { goto } from '$app/navigation';
  import { dreamsStore } from '$lib/stores/dreams.svelte';
  import { track } from '$lib/analytics/index.js';
  import { entitlementStore } from '$lib/entitlements.svelte.js';
  import { generateShareCard, shareCard } from '$lib/share/card';

  const WEEKS_SHORT = 4;
  const WEEKS_LONG = 12;

  let rangeWeeks = $state(WEEKS_SHORT);

  // Il today usato per streak (locale).
  const today = toDateStr(new Date());

  // Range: ultime N settimane.
  const range = $derived.by(() => {
    const toMon = mondayOf(today);
    const fromMon = addDays(toMon, -(rangeWeeks - 1) * 7);
    return { from: fromMon, to: toMon };
  });

  // Metriche settimanali nel range selezionato.
  const weekly = $derived(computeWeekly(dreamsStore.list, [], range));

  // Per delta e rate "recenti" usiamo sempre le ultime 8 settimane (2*window) indipendentemente dal toggle.
  const rangeDelta = $derived.by(() => {
    const toMon = mondayOf(today);
    const fromMon = addDays(toMon, -7 * 7); // 8 settimane
    return { from: fromMon, to: toMon };
  });
  const weeklyDelta = $derived(computeWeekly(dreamsStore.list, [], rangeDelta));
  const rate = $derived(lucidityRate(weeklyDelta, 4));
  const delta = $derived(lucidityDelta(weeklyDelta, 4));

  // Recall score settimana corrente.
  const recallThisWeek = $derived(recallScoreForWeek(dreamsStore.list, mondayOf(today)));
  const streak = $derived(currentStreak(dreamsStore.list, today));

  // Dream signs top 10.
  const signs = $derived(detectSigns(dreamsStore.list, { threshold: 2, top: 10 }));

  // Stato "primi passi": meno di 7 giorni di dati dalla prima entry.
  const hasEnoughData = $derived.by(() => {
    const list = dreamsStore.list;
    if (list.length === 0) return false;
    const oldest = list.reduce(
      (min, d) => (d.dreamedOn < min ? d.dreamedOn : min),
      list[0]?.dreamedOn ?? today,
    );
    const days = (new Date(today).getTime() - new Date(oldest).getTime()) / 86_400_000;
    return days >= 7;
  });

  const totalDreams = $derived(dreamsStore.list.filter((d) => d.deletedAt === null).length);

  // Formattazione italiana.
  const fmtRate = (n: number) =>
    n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtDelta = (n: number) => Math.abs(n).toLocaleString('it-IT', { maximumFractionDigits: 1 });

  // Share.
  let sharing = $state(false);
  async function onShare() {
    if (sharing) return;
    sharing = true;
    try {
      const lastLucid = dreamsStore.list.find((d) => d.lucidity >= 2 && d.deletedAt === null);
      const blob = await generateShareCard({
        organism: {
          seed: lastLucid?.seed ?? 'lucidme',
          emotion: (lastLucid?.emotion ?? 'meraviglia') as 'calma',
          lucidity: (lastLucid?.lucidity ?? 2) as 0 | 1 | 2 | 3,
        },
        lucidityRate: rate,
        streak,
      });
      await shareCard(blob);
    } finally {
      sharing = false;
    }
  }

  // Labels per il grafico (settimane abbreviate).
  const trendLabels = $derived(
    weekly.map((w, i) => (rangeWeeks === WEEKS_SHORT ? `sett ${i + 1}` : i % 3 === 0 ? `+${i}` : '')),
  );
  const trendData = $derived(weekly.map((w) => w.lucidCount));

  onMount(() => {
    void entitlementStore.ensureLoaded();
  });

  // Gating S8-1: trend > 4 settimane è Pro. Il tap sul 12-settimane apre il
  // paywall (senza cambiare il range attivo).
  function onLongRange(): void {
    if (!can('trend_long', entitlementStore.tier)) {
      void track('paywall_viewed');
      void goto('/pro');
      return;
    }
    rangeWeeks = WEEKS_LONG;
  }
</script>

<svelte:head>
  <title>Lume — Lucid Me</title>
</svelte:head>

<div class="eyebrow">{t('lume.eyebrow')}</div>
<h1>{t('lume.titolo_pre')} <em>{t('lume.titolo_em')}</em></h1>

{#if !hasEnoughData}
  <p class="pochi-dati">{t('lume.pochi_dati')}</p>
{:else}
  <!-- metrica grande -->
  <div class="big-metric">
    <div class="n">{fmtRate(rate)}</div>
    <div class="u">{t('lume.big_u')}</div>
  </div>
  {#if Math.abs(delta) >= 0.1}
    <div class="trend-line {delta > 0 ? 'su' : 'giu'}">
      {t(delta > 0 ? 'lume.delta_su' : 'lume.delta_giu', undefined, { n: fmtDelta(delta) })}
    </div>
  {/if}

  <!-- toggle settimane + grafico -->
  <div class="toggle">
    <button class:active={rangeWeeks === WEEKS_SHORT} onclick={() => (rangeWeeks = WEEKS_SHORT)}>
      {t('lume.settimane_4')}
    </button>
    <button class:active={rangeWeeks === WEEKS_LONG} onclick={onLongRange}>
      {t('lume.settimane_12')}
    </button>
  </div>
  <TrendChart data={trendData} labels={trendLabels} />

  <!-- dream signs -->
  <div class="field-label">{t('lume.signs_label')}</div>
  {#if signs.length === 0}
    <p class="no-signs">{t('lume.no_signs')}</p>
  {:else}
    <div class="signs">
      {#each signs as s}
        <span class="sign">{s.label} <b>×{s.count}</b></span>
      {/each}
    </div>
  {/if}

  <!-- tris mini -->
  <div class="row2">
    <Panel variant="b1" class="mini">
      <div class="n">{Math.round(recallThisWeek)}%</div>
      <div class="l">{t('lume.mini.recall')}</div>
    </Panel>
    <Panel variant="b2" class="mini">
      <div class="n">{streak}</div>
      <div class="l">{t('lume.mini.streak')}</div>
    </Panel>
    <Panel variant="b3" class="mini">
      <div class="n">{totalDreams}</div>
      <div class="l">{t('lume.mini.piantati')}</div>
    </Panel>
  </div>

  <Button variant="ghost" onclick={onShare} class="share-btn">{t('lume.condividi')}</Button>
{/if}

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
  .big-metric {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-top: 16px;
  }
  .big-metric .n {
    font-family: var(--lm-font-serif);
    font-size: 74px;
    font-weight: 300;
    background: linear-gradient(120deg, var(--lm-cyan), var(--lm-violet));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1;
  }
  .big-metric .u {
    font-size: 13px;
    color: var(--lm-ink-dim);
    max-width: 120px;
    line-height: 1.4;
  }
  .trend-line {
    font-size: 12.5px;
    margin-top: 6px;
  }
  .trend-line.su {
    color: var(--lm-cyan);
  }
  .trend-line.giu {
    color: var(--lm-ink-faint);
  }
  .toggle {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }
  .toggle button {
    background: none;
    border: 1px solid rgba(139, 136, 166, 0.25);
    color: var(--lm-ink-dim);
    padding: 6px 14px;
    border-radius: 40px;
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.14em;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.2, 0.6, 0.2, 1);
  }
  .toggle button.active {
    border-color: var(--lm-cyan);
    color: var(--lm-cyan);
  }
  .field-label {
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin: 26px 0 12px;
  }
  .signs {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
  }
  .sign {
    padding: 8px 15px;
    font-size: 12.5px;
    color: var(--lm-violet);
    border: 1px solid rgba(182, 156, 255, 0.3);
    border-radius: 55% 45% 60% 40% / 45% 60% 40% 55%;
    background: rgba(182, 156, 255, 0.06);
  }
  .sign b {
    font-weight: 500;
    color: var(--lm-ink);
  }
  .no-signs {
    color: var(--lm-ink-faint);
    font-size: 13px;
    font-style: italic;
  }
  .row2 {
    display: flex;
    gap: 14px;
    margin-top: 20px;
  }
  .row2 :global(.mini) {
    flex: 1;
    text-align: center;
    padding: 18px 8px;
  }
  .row2 :global(.mini .n) {
    font-family: var(--lm-font-serif);
    font-size: 30px;
    font-weight: 340;
  }
  .row2 :global(.mini .l) {
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin-top: 4px;
  }
  .pochi-dati {
    color: var(--lm-ink-dim);
    font-size: 14px;
    font-weight: 300;
    line-height: 1.6;
    margin-top: 18px;
    font-style: italic;
  }
  :global(.share-btn) {
    display: block;
    margin: 24px auto 0;
  }
</style>
