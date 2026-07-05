<!--
  Toast.svelte — render dello `.toast` del prototipo (riga 108).
  Si sottoscrive a `toastState` (store rune in stores/toast.svelte.ts).
  Posizione: bottom-center, translateY animato, opacity fade .5s.
-->
<script lang="ts">
  import { toastState } from '../stores/toast.svelte.js';
</script>

<div class="toast" class:show={toastState.visible} role="status" aria-live="polite">
  {toastState.msg}
</div>

<style>
  /* `.toast` + `.toast.show` (righe 108-109 prototipo). */
  .toast {
    position: absolute;
    left: 50%;
    bottom: 150px;
    transform: translateX(-50%) translateY(20px);
    background: rgba(20, 20, 48, 0.92);
    border: 1px solid rgba(127, 231, 220, 0.35);
    color: var(--lm-cyan);
    padding: 12px 24px;
    border-radius: 50px;
    font-family: var(--lm-font-sans);
    font-size: 13px;
    opacity: 0;
    transition: all 0.5s var(--lm-ease);
    z-index: 80;
    pointer-events: none;
    white-space: nowrap;
  }
  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
</style>
