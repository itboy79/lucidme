<!--
  Pro — paywall (ticket S8-1).

  Regole di prodotto:
   - Si APRE solo da tap su feature bloccata (mai interstitial, mai auto-popup
     all'avvio). I trigger vivono nelle route gate (sentiero giorno 8+, lume
     12 settimane, notte TLR).
   - Due piani (mensile/annuale, D-005: solo abbonamento, niente lifetime).
   - Acquisti NON attivi in questa build: il provider è lo stub
     (lib/billing) → toast `pro.non_disponibile`. Con RevenueCat il flusso
     sarà identico ma reale.
   - Tutto ciò che è gratis resta gratis (pro.f0): export ed E2E non si
     vendono MAI (regola privacy di prodotto).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t, Panel, Button, showToast } from '@lucidme/ui';
  import { goto, withBase } from '$lib/navigation';
  import { track } from '$lib/analytics/index.js';
  import { billing } from '$lib/billing/index.js';
  import type { Plan } from '$lib/billing/index.js';
  import { entitlementStore } from '$lib/entitlements.svelte.js';

  onMount(() => {
    void entitlementStore.ensureLoaded();
    // Unico emettitore di `paywall_viewed`: i trigger delle feature fanno
    // solo goto('/pro') — niente doppio conteggio (review finding #1).
    void track('paywall_viewed');
  });

  // Guard anti doppio tap: con il provider reale (RevenueCat) un secondo tap
  // durante l'acquisto non deve aprire due flussi (review finding #10).
  let busy = $state(false);

  async function onPurchase(plan: Plan): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      const res = await billing.purchase(plan);
      if (res.ok) {
        // Stub: mai ok. Con il provider reale: aggiorna il tier e torna.
        await entitlementStore.setTier(res.tier);
        void track('purchase_completed', { plan });
        void goto('/giardino');
        return;
      }
      showToast(t('pro.non_disponibile'));
    } finally {
      busy = false;
    }
  }

  async function onRestore(): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      const res = await billing.restore();
      if (res.ok) {
        await entitlementStore.setTier(res.tier);
        void goto('/giardino');
        return;
      }
      showToast(t('pro.non_disponibile'));
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Pro — Lucid Me</title>
</svelte:head>

<div class="eyebrow">{t('pro.eyebrow')}</div>
<h1>{t('pro.titolo_pre')} <em>{t('pro.titolo_em')}</em></h1>
<p class="sub">{t('pro.sub')}</p>

<div class="plans">
  <Panel variant="b1" class="plan">
    <div class="plan-name">{t('pro.piano_anno')}</div>
    <div class="plan-price">{t('pro.piano_anno_prezzo')}</div>
    <div class="plan-trial">{t('pro.piano_trial')}</div>
    <Button variant="primary" disabled={busy} onclick={() => onPurchase('yearly')}>
      {t('pro.cta_anno')}
    </Button>
  </Panel>

  <Panel variant="b2" class="plan">
    <div class="plan-name">{t('pro.piano_mese')}</div>
    <div class="plan-price">{t('pro.piano_mese_prezzo')}</div>
    <div class="plan-trial">&nbsp;</div>
    <Button variant="ghost" disabled={busy} onclick={() => onPurchase('monthly')}>
      {t('pro.cta_mese')}
    </Button>
  </Panel>
</div>

<ul class="features">
  <li>{t('pro.f0')}</li>
  <li>{t('pro.f1')}</li>
  <li>{t('pro.f2')}</li>
  <li>{t('pro.f3')}</li>
  <li>{t('pro.f4')}</li>
</ul>

<button class="restore" type="button" disabled={busy} onclick={onRestore}>
  {t('pro.ripristina')}
</button>

<button class="back" type="button" onclick={() => goto('/giardino')}>
  {t('pro.torna')}
</button>

<p class="legal">
  <a href={withBase('/privacy')}>{t('impostazioni.privacy')}</a> · <a href={withBase('/termini')}>{t('impostazioni.termini')}</a>
</p>

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

  .plans {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 24px;
  }
  :global(.plan) {
    text-align: center;
  }
  :global(.plan .plan-name) {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  :global(.plan .plan-price) {
    font-family: var(--lm-font-serif);
    font-size: 32px;
    font-weight: 300;
    margin-top: 6px;
    color: var(--lm-ink);
  }
  :global(.plan .plan-trial) {
    font-size: 12px;
    color: var(--lm-cyan);
    margin: 4px 0 14px;
    min-height: 1em;
    font-family: var(--lm-font-sans);
  }

  .features {
    list-style: none;
    margin: 26px 0 0;
    padding: 0;
    font-family: var(--lm-font-sans);
  }
  .features li {
    padding: 10px 0 10px 22px;
    position: relative;
    font-size: 13.5px;
    color: var(--lm-ink-dim);
    border-bottom: 1px solid rgba(139, 136, 166, 0.12);
    line-height: 1.45;
  }
  .features li::before {
    content: '✶';
    position: absolute;
    left: 0;
    color: var(--lm-cyan);
    font-size: 11px;
    top: 12px;
  }
  /* La prima riga (f0, "gratis resta gratis") è una promessa, non una feature:
     stile più tenue. */
  .features li:first-child {
    color: var(--lm-ink-faint);
    font-style: italic;
  }
  .features li:first-child::before {
    content: '·';
    font-size: 18px;
    top: 8px;
  }

  .restore {
    display: block;
    margin: 22px auto 0;
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

  .legal {
    margin-top: 26px;
    font-family: var(--lm-font-sans);
    font-size: 11.5px;
    color: var(--lm-ink-faint);
  }
  .legal a {
    color: var(--lm-ink-faint);
    text-decoration: underline dotted rgba(139, 136, 166, 0.4);
  }
</style>
