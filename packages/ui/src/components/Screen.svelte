<!--
  Screen.svelte — wrapper di sezione con transizione opacity del prototipo.
  CSS copiato da `.screen` (riga 23) e `.eyebrow` / `h1` / `.sub` (riga 26-29).

  Prop `active` controlla la classe `.active` (opacity 0↔1, .8s ease standard).
  Lo slot riceve il contenuto. Usato come backdrop di ogni route.
-->
<script lang="ts">
  interface Props {
    active?: boolean;
    /** Eyebrow testuale (`.eyebrow`, letter-spacing .28em). Opzionale. */
    eyebrow?: string;
    /** Classe extra per varianti (es. `notte-dim`). */
    class?: string;
    children?: import('svelte').Snippet;
  }
  let { active = true, eyebrow, class: klass = '', children }: Props = $props();
</script>

<section class="screen {klass}" class:active aria-hidden={!active}>
  {#if eyebrow}<div class="eyebrow">{eyebrow}</div>{/if}
  {@render children?.()}
</section>

<style>
  /* Copiato da `.screen` (riga 23 prototipo) — padding 58px 26px 130px. */
  .screen {
    position: absolute;
    inset: 0;
    padding: 58px 26px 130px;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .screen::-webkit-scrollbar {
    display: none;
  }
  .screen.active {
    opacity: 1;
    pointer-events: auto;
  }
  /* `.eyebrow` (riga 26). */
  .eyebrow {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
</style>
