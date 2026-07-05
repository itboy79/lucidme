<!--
  LucidityPicker.svelte — slider 4 livelli (riga 151-152 prototipo).
  <input type=range min=0 max=3 step=1>. Track gradient ink-faint→cyan, thumb
  radial white→cyan con glow. Etichette sotto: assente/barlume/lucido/pieno controllo.

  Props:
    value: 0|1|2|3        — livello corrente.
    onchange: (v) => void
-->
<script lang="ts">
  import type { Lucidity } from '@lucidme/core';

  interface Props {
    value: Lucidity;
    onchange?: (v: Lucidity) => void;
    /** Usa le etichette "detail" (non lucido/...) invece di quelle alba. */
    detailLabels?: boolean;
  }
  let { value, onchange, detailLabels = false }: Props = $props();

  const LABELS_ALBA = ['assente', 'barlume', 'lucido', 'pieno controllo'] as const;
  const LABELS_DETAIL = ['non lucido', 'barlume', 'lucido', 'pieno controllo'] as const;

  function handleChange(e: Event): void {
    const v = Number((e.target as HTMLInputElement).value) as Lucidity;
    onchange?.(v);
  }
</script>

<input
  type="range"
  min="0"
  max="3"
  step="1"
  value={value}
  aria-label="Livello di lucidità"
  oninput={handleChange}
/>
<div class="luc-scale">
  {#each (detailLabels ? LABELS_DETAIL : LABELS_ALBA) as lbl, i (i)}
    <span class:on={value === i}>{lbl}</span>
  {/each}
</div>

<style>
  /* `input[type=range]` (riga 61) + thumb (riga 62) + `.luc-scale` (riga 63). */
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--lm-ink-faint), var(--lm-cyan));
    outline: none;
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, var(--lm-cyan));
    box-shadow: 0 0 14px rgba(127, 231, 220, 0.6);
    cursor: pointer;
  }
  input[type='range']::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, var(--lm-cyan));
    box-shadow: 0 0 14px rgba(127, 231, 220, 0.6);
    cursor: pointer;
  }
  .luc-scale {
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: var(--lm-ink-faint);
    margin-top: 8px;
    font-family: var(--lm-font-sans);
  }
  .luc-scale span.on {
    color: var(--lm-cyan);
  }
</style>
