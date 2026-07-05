<!--
  EmotionPicker.svelte — 6 chip emozione (`.emo`, riga 59 prototipo).
  Radius blob `40% 60% 55% 45%/60% 40% 60% 40%`. Selezionata → bg `hsl(hue,70%,72%)`,
  testo `--lm-bg0`, font-weight 500 (riga 60: `.emo.on`).

  Props:
    value: Emotion | null   — emozione selezionata (o null).
    onchange: (e: Emotion) => void

  Le 6 emozioni vengono da `@lucidme/core` (EMOTIONS); i hue dai token ui.
  Niente dipendenza da @lucidme/generative qui (ui resta snello: core + token).
-->
<script lang="ts">
  import { EMOTIONS } from '@lucidme/core';
  import type { Emotion } from '@lucidme/core';
  import { emotionHues } from '../tokens/index.js';

  interface Props {
    value: Emotion | null;
    onchange?: (e: Emotion) => void;
  }
  let { value, onchange }: Props = $props();

  function select(e: Emotion): void {
    onchange?.(e);
  }

  // Stile inline per il bg hue della chip selezionata (come nel prototipo riga 334).
  function chipStyle(e: Emotion): string {
    if (value !== e) return '';
    const hue = emotionHues[e];
    return `background: hsl(${hue},70%,72%); border-color: transparent;`;
  }
</script>

<div class="emotions" role="radiogroup" aria-label="Emozione dominante">
  {#each EMOTIONS as e (e)}
    <button
      type="button"
      role="radio"
      aria-checked={value === e}
      class="emo"
      class:on={value === e}
      style={chipStyle(e)}
      onclick={() => select(e)}
    >
      {e}
    </button>
  {/each}
</div>

<style>
  /* `.emotions` + `.emo` + `.emo.on` (righe 58-60 prototipo). */
  .emotions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .emo {
    padding: 9px 16px;
    border-radius: var(--lm-radius-emotion-chip);
    border: 1px solid rgba(139, 136, 166, 0.3);
    background: none;
    color: var(--lm-ink-dim);
    font-family: var(--lm-font-sans);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.4s var(--lm-ease);
    text-transform: lowercase;
  }
  .emo.on {
    color: var(--lm-bg0);
    font-weight: 500;
  }
</style>
