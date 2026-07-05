<!--
  TextEntry.svelte — textarea auto-resize per il racconto del sogno (body).
  Auto-resize: adatta l'altezza al contenuto (min/max height). Stile coerente
  con `.sub`/`#dBody` del prototipo (font-weight 300, line-height ~1.7).
  Non esiste una textarea esplicita nel prototipo (usa voice), ma il font è
  allineato a `.today-card .d` / `#dBody`.

  Props:
    value: string             — testo corrente (two-way via onchange).
    placeholder?: string
    onchange: (v: string) => void
    maxlength?: number        — default BODY_MAX di core (20_000).
-->
<script lang="ts">
  import { BODY_MAX } from '@lucidme/core';

  interface Props {
    value: string;
    placeholder?: string;
    onchange?: (v: string) => void;
    maxlength?: number;
    id?: string;
    /** Etichetta accessibilità (mappata su `aria-label` della textarea). */
    ariaLabel?: string;
  }
  let {
    value = $bindable(''),
    placeholder = '',
    onchange,
    maxlength = BODY_MAX,
    id,
    ariaLabel,
  }: Props = $props();

  let el: HTMLTextAreaElement | undefined = $state();

  // Auto-resize: dopo ogni update del valore, adatta l'altezza.
  $effect(() => {
    // tocca `value` per re-run sull'update
    void value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  });

  function handleInput(e: Event): void {
    const v = (e.target as HTMLTextAreaElement).value;
    value = v;
    onchange?.(v);
  }
</script>

<textarea
  bind:this={el}
  class="entry"
  {id}
  {placeholder}
  {maxlength}
  aria-label={ariaLabel}
  oninput={handleInput}
></textarea>

<style>
  .entry {
    width: 100%;
    min-height: 96px;
    max-height: 50vh;
    resize: none;
    overflow: hidden;
    background: rgba(20, 20, 48, 0.4);
    border: 1px solid rgba(139, 136, 166, 0.3);
    border-radius: 18px;
    padding: 14px 16px;
    color: var(--lm-ink-dim);
    font-family: var(--lm-font-sans);
    font-size: 15px;
    font-weight: 300;
    line-height: 1.75;
    outline: none;
    transition: border-color 0.3s var(--lm-ease);
  }
  .entry:focus {
    border-color: rgba(127, 231, 220, 0.5);
  }
  .entry::placeholder {
    color: var(--lm-ink-faint);
  }
</style>
