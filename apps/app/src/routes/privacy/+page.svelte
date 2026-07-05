<!--
  /privacy — placeholder informativa privacy (S2-5).
  Pagina standalone (no Nav): messaggio local-first + ritorno al giardino.
-->
<script lang="ts">
  import { t } from '@lucidme/ui';
  import { goto } from '$app/navigation';

  function back(): void {
    goto('/giardino');
  }
</script>

<div class="page">
  <div class="eyebrow">{t('privacy.eyebrow')}</div>
  <h1>{t('privacy.titolo_pre')} <em>{t('privacy.titolo_em')}</em></h1>
  <p class="corpo">{t('privacy.corpo')}</p>
  <button class="back" type="button" onclick={back}>← {t('nav.giardino')}</button>
</div>

<style>
  .page {
    position: relative;
    min-height: 100dvh;
    padding: 70px 28px 48px;
    background: radial-gradient(120% 90% at 50% -10%, var(--lm-bg2) 0%, var(--lm-bg1) 45%, var(--lm-bg0) 100%);
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
    font-size: 32px;
    line-height: 1.14;
    margin: 8px 0 0;
  }
  h1 em {
    font-style: italic;
    color: var(--lm-violet);
  }
  .corpo {
    color: var(--lm-ink-dim);
    font-size: 15px;
    font-weight: 300;
    line-height: 1.7;
    margin-top: 22px;
    font-family: var(--lm-font-sans);
  }
  .back {
    margin-top: 32px;
    background: none;
    border: none;
    color: var(--lm-cyan);
    font-family: var(--lm-font-sans);
    font-size: 13px;
    cursor: pointer;
    letter-spacing: 0.08em;
  }
</style>
