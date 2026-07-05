<!--
  Panel.svelte — superficie organica `.blob` del prototipo (riga 35-38).
  Background gradient violet→cyan, bordo hairline, border-radius asimmetrico,
  animazione `breathe` 7s ease-in-out infinite. Varianti b1/b2/b3.

  Prop `variant`: 'b1' (default) | 'b2' | 'b3' → cambia radius e animation-delay.
-->
<script lang="ts">
  interface Props {
    variant?: 'b1' | 'b2' | 'b3';
    /** Classe extra (es. `today-card`, `mini`, `wbtb`). */
    class?: string;
    children?: import('svelte').Snippet;
  }
  let { variant = 'b1', class: klass = '', children }: Props = $props();
</script>

<div class="blob {variant} {klass}">
  {@render children?.()}
</div>

<style>
  /* `.blob` (riga 35 prototipo) — radius + animation default (b1, delay 0). */
  .blob {
    background: linear-gradient(145deg, rgba(182, 156, 255, 0.1), rgba(127, 231, 220, 0.05));
    border: 1px solid rgba(182, 156, 255, 0.16);
    border-radius: var(--lm-blob-b1);
    padding: 20px 22px;
    animation: breathe var(--lm-keyframe-breathe) ease-in-out infinite;
  }
  /* `.blob.b2` (riga 36). */
  .b2 {
    border-radius: var(--lm-blob-b2);
    animation-delay: var(--lm-blob-delay-b2);
  }
  /* `.blob.b3` (riga 37). */
  .b3 {
    border-radius: var(--lm-blob-b3);
    animation-delay: var(--lm-blob-delay-b3);
  }
  /* `@keyframes breathe` (riga 38) — 0/100% = b1, 50% = mid. */
  @keyframes breathe {
    0%,
    100% {
      border-radius: var(--lm-blob-b1);
    }
    50% {
      border-radius: 45% 55% 47% 53% / 56% 44% 57% 43%;
    }
  }
  /* a11y: chi riduce il movimento non vede il breathing. */
  @media (prefers-reduced-motion: reduce) {
    .blob {
      animation: none;
    }
  }
</style>
