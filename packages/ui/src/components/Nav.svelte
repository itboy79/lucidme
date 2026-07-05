<!--
  Nav.svelte — la nav "orbital moon" del prototipo (righe 40-49, 206-212).
  5 moon button con .orb; il centrale (`.center`) è più grande.
  Posizionamento orbitale: nth-child 1/5 traslati giù 14px, 2/4 di 4px, 3 = center.

  Props:
    items: { id, label, icon }[]  — le 5 sezioni (ordine significativo).
    active: string                — id della sezione attiva.
    onselect: (id) => void        — callback click.

  Gli `icon` sono chiavi SVG mappate sotto (path copiati dal prototipo).
-->
<script lang="ts">
  interface MoonItem {
    id: string;
    label: string;
    /** Chiave icona: giardino|sentiero|alba|notte|lume. */
    icon: keyof typeof ICON_PATHS | string;
  }
  interface Props {
    items: readonly MoonItem[];
    active: string;
    onselect?: (id: string) => void;
  }
  let { items, active, onselect }: Props = $props();

  // Path SVG copiati ESATTAMENTE dal prototipo (righe 207-211).
  // viewbox 0 0 24 24, stroke currentColor, fill none.
  const ICON_PATHS = {
    giardino: 'M12 21v-8m0 0c0-4 3-7 7-7-1 5-3 7-7 7zm0 0c0-4-3-7-7-7 1 5 3 7 7 7z',
    sentiero: 'M5 21c6-2 2-8 8-10s5-6 6-8M9 7l2-2M15 13l2-2',
    alba: 'M12 3v3M5 8l2 2M19 8l-2 2M4 17h16M8 17a4 4 0 018 0',
    notte: 'M20 14A8 8 0 1110 4a7 7 0 0010 10z',
    lume:
      'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1',
  } as const;

  // La luna centrale è la 3ª (index 2) — come nel prototipo.
  function isCenter(i: number): boolean {
    const n = items.length;
    return n % 2 === 1 && i === Math.floor(n / 2);
  }

  function handle(id: string): void {
    onselect?.(id);
  }
</script>

<nav class="nav" aria-label="Navigazione sezioni">
  {#each items as item, i (item.id)}
    <button
      type="button"
      class="moon"
      class:center={isCenter(i)}
      class:on={item.id === active}
      data-scr={item.id}
      aria-current={item.id === active ? 'page' : undefined}
      aria-label={item.label}
      onclick={() => handle(item.id)}
    >
      <span class="orb">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {#if item.icon === 'lume'}
            <!-- lume: cerchio + raggi -->
            <circle cx="12" cy="12" r="4" />
            <path d={ICON_PATHS.lume} />
          {:else if ICON_PATHS[item.icon as keyof typeof ICON_PATHS]}
            <path d={ICON_PATHS[item.icon as keyof typeof ICON_PATHS]} />
          {/if}
        </svg>
      </span>
      <span class="label">{item.label}</span>
    </button>
  {/each}
</nav>

<style>
  /* `.moon` + `#nav` + `.orb` copiati dal prototipo (righe 40-49). */
  .nav {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 112px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 14px;
    padding-bottom: 22px;
    background: linear-gradient(to top, rgba(6, 6, 14, 0.96) 30%, transparent);
    z-index: 40;
  }
  .moon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--lm-ink-faint);
    font-family: var(--lm-font-sans);
    font-size: 9.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.5s var(--lm-ease);
    transform: translateY(0);
  }
  .moon .orb {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid rgba(139, 136, 166, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s var(--lm-ease);
    background: rgba(20, 20, 48, 0.5);
  }
  .moon svg {
    width: 17px;
    height: 17px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  /* Posizionamento orbitale (nth-child 1/5, 2/4, 3=center) del prototipo.
     Applicato via :nth-of-type per generalizzare a N item dispari. */
  .moon:nth-of-type(1),
  .moon:nth-of-type(5) {
    transform: translateY(14px);
  }
  .moon:nth-of-type(2),
  .moon:nth-of-type(4) {
    transform: translateY(4px);
  }
  .moon.center .orb {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, rgba(182, 156, 255, 0.25), rgba(127, 231, 220, 0.15));
    border-color: rgba(182, 156, 255, 0.5);
  }
  .moon.center svg {
    width: 23px;
    height: 23px;
  }
  .moon.on {
    color: var(--lm-cyan);
  }
  .moon.on .orb {
    border-color: var(--lm-cyan);
    box-shadow:
      0 0 18px rgba(127, 231, 220, 0.35),
      inset 0 0 12px rgba(127, 231, 220, 0.12);
  }
  /* Center deve mantenere la sua translateY(0) anche se è nth 3 (non 1/2/4/5). */
  .moon.center {
    transform: translateY(0);
  }
</style>
