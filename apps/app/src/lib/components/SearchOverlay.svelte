<!--
  SearchOverlay.svelte — ricerca full-screen nel giardino (S2-5).

  Input full-screen che, dopo 250ms di debounce, chiama `dreamRepo.search(q)`
  e mostra i risultati come lista minimale (titolo + data). Il tap su un
  risultato apre il DreamDetail del sogno scelto.

  Props:
    onclose: () => void
    onpick: (dream: Dream) => void   — apre il detail del risultato scelto.
-->
<script lang="ts">
  import type { Dream } from '@lucidme/core';
  import { t } from '@lucidme/ui';
  import { getDbClient } from '../db/client.svelte.js';
  import { formatDreamDate } from '../date.js';

  interface Props {
    onclose: () => void;
    onpick: (dream: Dream) => void;
  }
  let { onclose, onpick }: Props = $props();

  let query = $state('');
  let results = $state<Dream[]>([]);
  let searched = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  // Focus all'apertura.
  $effect(() => {
    if (inputEl) inputEl.focus();
  });

  // Debounce 250ms sulla query.
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const q = query;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(async () => {
      const term = q.trim();
      if (term === '') {
        results = [];
        searched = false;
        return;
      }
      const { dreamRepo } = await getDbClient();
      const found = await dreamRepo.search(term);
      results = found;
      searched = true;
    }, 250);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  });

  function handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

<div class="overlay" role="dialog" aria-modal="true" aria-label={t('search.eyebrow')}>
  <div class="bar">
    <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
    <input
      bind:this={inputEl}
      bind:value={query}
      class="input"
      type="search"
      placeholder={t('search.placeholder')}
      aria-label={t('search.placeholder')}
      autocomplete="off"
    />
    <button class="close" type="button" aria-label={t('search.close')} onclick={onclose}>✕</button>
  </div>

  <div class="results">
    {#if searched && results.length === 0}
      <p class="empty">{t('search.nessun_risultato').replace('{q}', query.trim())}</p>
    {/if}
    {#each results as d (d.id)}
      <button class="row" type="button" onclick={() => onpick(d)}>
        <span class="rtitle">{d.title}</span>
        <span class="rmeta">{formatDreamDate(d.dreamedOn)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(5, 5, 12, 0.7);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    padding: 56px 22px 32px;
    animation: fadeIn 0.4s var(--lm-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid rgba(127, 231, 220, 0.3);
    border-radius: 50px;
    background: rgba(20, 20, 48, 0.6);
  }
  .ico {
    width: 18px;
    height: 18px;
    stroke: var(--lm-cyan);
    fill: none;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex: none;
  }
  .input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--lm-ink);
    font-family: var(--lm-font-sans);
    font-size: 15px;
    font-weight: 300;
  }
  .input::placeholder {
    color: var(--lm-ink-faint);
  }
  .close {
    background: none;
    border: none;
    color: var(--lm-ink-dim);
    font-size: 16px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 50%;
  }
  .results {
    margin-top: 18px;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .results::-webkit-scrollbar {
    display: none;
  }
  .empty {
    text-align: center;
    color: var(--lm-ink-faint);
    font-family: var(--lm-font-sans);
    font-size: 14px;
    font-weight: 300;
    margin-top: 40px;
  }
  .row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(139, 136, 166, 0.14);
    padding: 14px 6px;
    cursor: pointer;
  }
  .rtitle {
    font-family: var(--lm-font-serif);
    font-size: 17px;
    font-weight: 340;
    color: var(--lm-ink);
  }
  .rmeta {
    font-family: var(--lm-font-sans);
    font-size: 11.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }

  @media (prefers-reduced-motion: reduce) {
    .overlay {
      animation: none;
    }
  }
</style>
