<!--
  RealityCheckOverlay.svelte — overlay morbido in-foreground (§S5-3).

  Quando l'app è in foreground al momento del check, mostriamo questo overlay
  invece della notifica. Soft modal con il prompt + due bottoni
  ("Stavo sognando 😴" / "Ero sveglio"). La risposta scrive via RCRepo.
-->
<script lang="ts">
  import { t, showToast } from '@lucidme/ui';
  import { getDbClient } from '$lib/db/client.svelte.js';
  import { getPromptById } from '$lib/reality-check/prompt-pool.js';

  interface Props {
    /** Id del prompt da mostrare. */
    promptId: string;
    /** Id dell'evento RC (per scrivere l'acknowledgment). */
    eventId: string;
    /** Callback alla chiusura (dopo risposta o dismiss). */
    onclose: () => void;
  }

  let { promptId, eventId, onclose }: Props = $props();

  const prompt = $derived.by(() => getPromptById(promptId));

  async function answer(wasDreaming: boolean): Promise<void> {
    try {
      const { rcRepo } = await getDbClient();
      await rcRepo.acknowledge(eventId, wasDreaming);
      showToast(
        wasDreaming ? t('rc.sognando_toast') : t('rc.sveglio_toast'),
      );
    } catch {
      // best-effort: chiudiamo comunque
    }
    onclose();
  }
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={t('rc.overlay_titolo')}>
  <div class="backdrop"></div>
  <div class="panel">
    <div class="eyebrow">{t('rc.overlay_titolo')}</div>
    <div class="sub">{t('rc.overlay_sub')}</div>
    <p class="prompt">{prompt?.text ?? ''}</p>
    <div class="actions">
      <button type="button" class="btn dream" onclick={() => answer(true)}>
        {t('rc.btn_sognando')}
      </button>
      <button type="button" class="btn awake" onclick={() => answer(false)}>
        {t('rc.btn_sveglio')}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.4s ease;
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
    padding: 28px 24px 24px;
    border: 1px solid rgba(127, 231, 220, 0.18);
    border-radius: 28px;
    background: linear-gradient(160deg, rgba(20, 20, 48, 0.96), rgba(10, 10, 20, 0.98));
    text-align: center;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .eyebrow {
    font-family: var(--lm-font-sans, sans-serif);
    font-size: 11px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--lm-cyan, #7fe7dc);
  }
  .sub {
    font-size: 12px;
    color: var(--lm-ink-faint, #565370);
    margin-top: 4px;
  }
  .prompt {
    font-family: var(--lm-font-serif, serif);
    font-size: 22px;
    font-weight: 340;
    line-height: 1.4;
    color: var(--lm-ink, #e8e6f2);
    margin: 22px 0 24px;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .btn {
    width: 100%;
    padding: 14px;
    border-radius: 50px;
    border: none;
    font-family: var(--lm-font-sans, sans-serif);
    font-weight: 600;
    font-size: 14.5px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  .btn:active { transform: scale(0.97); }
  .btn.dream {
    background: linear-gradient(120deg, var(--lm-violet, #b69cff), var(--lm-cyan, #7fe7dc));
    color: #0a0a14;
  }
  .btn.awake {
    background: transparent;
    border: 1px solid rgba(139, 136, 166, 0.4);
    color: var(--lm-ink-dim, #8b88a6);
  }
</style>
