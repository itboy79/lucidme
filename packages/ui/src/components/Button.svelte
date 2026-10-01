<!--
  Button.svelte — due sole varianti, dal prototipo:
    primary → `.plant-btn` (riga 64): gradient violet→cyan, radius 60px, w 100%.
    ghost   → `.start-btn` (riga 75): bordo cyan, bg cyan 8%, radius 50px.

  Prop `variant`: 'primary' | 'ghost'. Callback `onclick`.
  `type` default 'button'._attributi nativi via rest props (`...rest`).
-->
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'ghost';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }
  let {
    variant = 'primary',
    type = 'button',
    disabled = false,
    class: klass = '',
    onclick,
    children,
  }: Props = $props();
</script>

<button {type} {disabled} class="btn {variant} {klass}" onclick={onclick}>
  {@render children?.()}
</button>

<style>
  .btn {
    font-family: var(--lm-font-sans);
    cursor: pointer;
    transition:
      transform 0.3s var(--lm-ease),
      box-shadow 0.3s var(--lm-ease);
  }
  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  /* `.plant-btn` (riga 64). */
  .primary {
    margin-top: 30px;
    width: 100%;
    padding: 17px;
    border-radius: 60px;
    border: none;
    background: linear-gradient(120deg, var(--lm-violet), var(--lm-cyan));
    color: #0a0a14;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.06em;
  }
  .primary:active {
    transform: scale(0.97);
  }
  /* Desktop: risposta al passaggio — un bagliore, niente colori nuovi. */
  @media (hover: hover) and (pointer: fine) {
    .primary:hover {
      box-shadow: 0 0 26px rgba(127, 231, 220, 0.35), 0 6px 24px rgba(10, 10, 20, 0.5);
      transform: translateY(-1px);
    }
    .ghost:hover {
      background: rgba(127, 231, 220, 0.16);
      transform: translateY(-1px);
    }
  }
  /* `.start-btn` (riga 75). */
  .ghost {
    margin-top: 16px;
    padding: 12px 26px;
    border-radius: 50px;
    border: 1px solid var(--lm-cyan);
    background: rgba(127, 231, 220, 0.08);
    color: var(--lm-cyan);
    font-size: 13px;
    letter-spacing: 0.08em;
  }
</style>
