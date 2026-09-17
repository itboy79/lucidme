<!--
  FeedbackButton.svelte — bottone feedback per beta tester (ticket S9-2).

  Montato nel layout radice; VISIBILE solo se `PUBLIC_BETA=true`
  (isBetaBuild, lib/feedback). Apre un piccolo overlay con textarea:
  l'invio usa `sendFeedback` (POST all'endpoint se configurato, coda
  locale altrimenti). Nessuno screenshot: vedi doc-comment in lib/feedback.
-->
<script lang="ts">
  import { t, showToast } from '@lucidme/ui';
  import { isBetaBuild, sendFeedback } from '$lib/feedback/index.js';

  let open = $state(false);
  let text = $state('');
  let sending = $state(false);

  async function submit(): Promise<void> {
    if (sending) return;
    const trimmed = text.trim();
    if (trimmed === '') return;
    sending = true;
    const result = await sendFeedback(trimmed);
    sending = false;
    showToast(t(result === 'sent' ? 'feedback.inviato' : 'feedback.accodato'));
    text = '';
    open = false;
  }
</script>

{#if isBetaBuild()}
  <button
    class="fab"
    type="button"
    aria-label={t('feedback.bottone')}
    onclick={() => (open = !open)}
  >
    ✶
  </button>

  {#if open}
    <div class="overlay" role="dialog" aria-modal="true" aria-label={t('feedback.titolo')}>
      <button
        class="backdrop"
        type="button"
        aria-label={t('feedback.annulla')}
        onclick={() => (open = false)}
      ></button>
      <div class="panel">
        <div class="eyebrow">{t('feedback.titolo')}</div>
        <p class="sub">{t('feedback.sub')}</p>
        <textarea
          class="text"
          bind:value={text}
          placeholder={t('feedback.placeholder')}
          rows="4"
          maxlength="2000"
        ></textarea>
        <div class="actions">
          <button type="button" class="btn primary" disabled={sending || text.trim() === ''} onclick={submit}>
            {t('feedback.invia')}
          </button>
          <button type="button" class="btn ghost" disabled={sending} onclick={() => (open = false)}>
            {t('feedback.annulla')}
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .fab {
    position: fixed;
    right: 16px;
    top: 16px;
    z-index: 70;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(127, 231, 220, 0.35);
    background: rgba(20, 20, 48, 0.6);
    color: var(--lm-cyan, #7fe7dc);
    font-size: 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }
  .fab:hover {
    border-color: var(--lm-cyan, #7fe7dc);
    box-shadow: 0 0 14px rgba(127, 231, 220, 0.25);
  }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 5, 12, 0.55);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
  }
  .panel {
    position: relative;
    width: 100%;
    max-width: 400px;
    margin: 0 18px;
    padding: 26px 22px 22px;
    border: 1px solid rgba(127, 231, 220, 0.18);
    border-radius: 28px;
    background: linear-gradient(160deg, rgba(20, 20, 48, 0.96), rgba(10, 10, 20, 0.98));
  }
  .eyebrow {
    font-family: var(--lm-font-sans, sans-serif);
    font-size: 11px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--lm-cyan, #7fe7dc);
  }
  .sub {
    font-size: 12.5px;
    color: var(--lm-ink-faint, #565370);
    margin: 8px 0 14px;
    line-height: 1.5;
    font-family: var(--lm-font-sans, sans-serif);
  }
  .text {
    width: 100%;
    background: rgba(10, 10, 20, 0.6);
    border: 1px solid rgba(139, 136, 166, 0.3);
    border-radius: 16px;
    padding: 12px 14px;
    color: var(--lm-ink, #e8e6f2);
    font-family: var(--lm-font-sans, sans-serif);
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
  }
  .text:focus {
    border-color: rgba(127, 231, 220, 0.5);
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 14px;
  }
  .btn {
    width: 100%;
    padding: 13px;
    border-radius: 50px;
    border: none;
    font-family: var(--lm-font-sans, sans-serif);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.primary {
    background: linear-gradient(120deg, var(--lm-violet, #b69cff), var(--lm-cyan, #7fe7dc));
    color: #0a0a14;
  }
  .btn.ghost {
    background: transparent;
    border: 1px solid rgba(139, 136, 166, 0.4);
    color: var(--lm-ink-dim, #8b88a6);
  }
</style>
