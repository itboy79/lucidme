<!--
  Giardino — il giardino onirico (S2-4).

  Layout:
   - header: eyebrow + h1 "{n} sogni *fioriti*<br>questa luna" (n = questa luna)
     + bottoni ricerca ( apre SearchOverlay) e impostazioni ( → /impostazioni)
   - canvas full-screen dietro header: organismi animati via gardenLayout + renderFrame
   - tap su organismo → DreamDetail
   - paginazione "per luna": >12 sogni totali → chip mese + scroll-snap orizzontale
   - stato vuoto (0 sogni): messaggio + CTA → /alba
   - ?new=<id>: organismo pulsante 2s (highlight del sogno appena piantato)
-->
<script lang="ts">
  import { t, showToast } from '@lucidme/ui';
  import type { Dream } from '@lucidme/core';
  import { renderFrame, gardenLayout } from '@lucidme/generative';
  import type { OrganismParams, GardenNode, GardenPosition } from '@lucidme/generative';
  import { goto } from '$lib/navigation';
  import { page } from '$app/stores';
  import { dreamsStore } from '$lib/stores/dreams.svelte.js';
  import { getDbClient } from '$lib/db/client.svelte.js';
  import { fitCanvas, observeResize } from '$lib/canvas.js';
  import { buildMoons, countThisMoon, monthKey } from '$lib/date.js';
  import DreamDetail from '$lib/components/DreamDetail.svelte';
  import SearchOverlay from '$lib/components/SearchOverlay.svelte';

  // Carica subito (anche se il load lo ha già fatto).
  void dreamsStore.ensureLoaded();

  const dreams = $derived(dreamsStore.list);

  // ---- Paginazione per luna ----
  const PAGINATION_THRESHOLD = 12;
  const moons = $derived(buildMoons(dreams.map((d) => d.dreamedOn)));
  const paginated = $derived(dreams.length > PAGINATION_THRESHOLD);
  let activeMoon = $state<string | null>(null);

  // Luna attiva di default = la più recente. Si aggiorna quando cambia la lista.
  $effect(() => {
    if (moons.length === 0) {
      activeMoon = null;
      return;
    }
    if (!activeMoon || !moons.some((m) => m.key === activeMoon)) {
      activeMoon = moons[0]?.key ?? null;
    }
  });

  const dreamsThisMoon = $derived(countThisMoon(dreams.map((d) => d.dreamedOn)));

  // Sogni della luna corrente (o tutti se non paginati).
  const visibleDreams = $derived.by<Dream[]>(() => {
    if (!paginated || !activeMoon) return dreams;
    return dreams.filter((d) => monthKey(d.dreamedOn) === activeMoon);
  });

  // ---- Layout organismi ----
  let canvas: HTMLCanvasElement | undefined = $state();
  let raf = 0;

  const layoutNodes = $derived.by<GardenNode[]>(() =>
    visibleDreams.map((d) => ({ seed: d.seed, lucidity: d.lucidity, bodyLen: d.body.length })),
  );

  // Posizioni correnti (ricalcolate su resize/visibleDreams). Le teniamo in uno
  // state mutato dal loop di resize per evitare re-render del markup.
  let positions = $state<GardenPosition[]>([]);

  function recomputeLayout(c: HTMLCanvasElement): void {
    const rect = c.getBoundingClientRect();
    positions = gardenLayout(layoutNodes, rect.width, rect.height);
  }

  // Highlight: ?new=<id> pulsa per 2s.
  const newId = $derived($page.url.searchParams.get('new'));
  let highlightUntil = $state(0);

  $effect(() => {
    const id = newId;
    if (!id) {
      highlightUntil = 0;
      return;
    }
    highlightUntil = performance.now() + 2000;
    // Pulisci il query param dopo aver innescato l'highlight (senza history entry).
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }, 2200);
    return () => clearTimeout(t);
  });

  // Loop di animazione + resize observer.
  $effect(() => {
    if (!canvas) return;
    const c = canvas;
    // tocca visibleDreams per ri-armare quando cambia il set
    void visibleDreams.length;
    fitCanvas(c);
    recomputeLayout(c);
    const handle = observeResize(c, (el) => {
      fitCanvas(el);
      recomputeLayout(el);
    });

    const loop = (time: number) => {
      const ctx = c.getContext('2d');
      const rect = c.getBoundingClientRect();
      if (ctx) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        const list = visibleDreams;
        // Pulviscolo ambientale (deterministico): il giardino respira anche
        // tra gli organismi. 24 granelli che salgono lenti.
        for (let d = 0; d < 24; d++) {
          const dx = ((d * 137.5) % rect.width + ((time * 0.004 * (1 + (d % 3))) % 60)) % rect.width;
          const dy = rect.height - ((time * 0.008 * (1 + (d % 2)) + d * 53) % (rect.height + 40));
          const da = 0.05 + 0.08 * ((d % 4) / 4);
          ctx.beginPath();
          ctx.arc(dx, dy, 0.8 + (d % 3) * 0.5, 0, 7);
          ctx.fillStyle = `rgba(182, 156, 255, ${da})`;
          ctx.fill();
        }
        for (let i = 0; i < positions.length; i++) {
          const pos = positions[i];
          const dream = list[i];
          if (!pos || !dream) continue;
          const params: OrganismParams = {
            seed: dream.seed,
            emotion: dream.emotion,
            lucidity: dream.lucidity,
          };
          let scale = 1;
          if (newId && dream.id === newId && time < highlightUntil) {
            // pulsa 2s: scala tra 1 e 1.25
            scale = 1 + 0.25 * (0.5 + 0.5 * Math.sin((time / 180) * Math.PI));
          }
          if (i === hoverIndex) {
            scale = Math.max(scale, 1.08);
            // alone morbido sotto l'organismo hovered (feedback desktop)
            const g = ctx.createRadialGradient(pos.x, pos.y, pos.size * 0.2, pos.x, pos.y, pos.size * 1.6);
            g.addColorStop(0, 'rgba(127, 231, 220, 0.12)');
            g.addColorStop(1, 'rgba(127, 231, 220, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pos.size * 1.6, 0, 7);
            ctx.fill();
          }
          renderFrame(ctx, params, pos.x, pos.y, pos.size * scale, time);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      handle.disconnect();
    };
  });

  // ---- Hover (desktop): alone sull'organismo vicino al puntatore ----
  let hoverIndex = -1;

  function onCanvasMove(e: MouseEvent): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let found = -1;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (pos && Math.hypot(pos.x - x, pos.y - y) < pos.size * 1.25) {
        found = i;
        break;
      }
    }
    hoverIndex = found;
    canvas.style.cursor = found >= 0 ? 'pointer' : 'default';
  }

  // ---- Tap su organismo → DreamDetail ----
  function onCanvasClick(e: MouseEvent): void {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const list = visibleDreams;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const dream = list[i];
      if (!pos || !dream) continue;
      if (Math.hypot(pos.x - x, pos.y - y) < pos.size * 1.25) {
        selected = dream;
        return;
      }
    }
  }

  // ---- DreamDetail state ----
  let selected = $state<Dream | null>(null);

  function closeDetail(): void {
    selected = null;
  }

  function editDream(id: string): void {
    selected = null;
    goto(`/alba?edit=${encodeURIComponent(id)}`);
  }

  // Soft delete + undo 5s. Teniamo il dream rimosso per poter ripristinare.
  let pendingDelete: { dream: Dream; timer: ReturnType<typeof setTimeout> } | null = null;

  async function deleteDream(dream: Dream): Promise<void> {
    selected = null;
    const { dreamRepo } = await getDbClient();
    try {
      await dreamRepo.softDelete(dream.id);
    } catch {
      showToast(t('alba.errore_generico'));
      return;
    }
    dreamsStore.remove(dream.id);
    if (pendingDelete) clearTimeout(pendingDelete.timer);
    const timer = setTimeout(async () => {
      pendingDelete = null;
      // commit implicito: già soft-deleted, nient'altro da fare.
    }, 5000);
    pendingDelete = { dream, timer };
    showToast(t('detail.eliminato_toast'));
  }

  // Punto di ingresso per il toast-undo: esposto via callback globale.
  // Usiamo una shortcut: intercettiamo il click sul toast (pointer) per undo.
  // Poiché Toast non supporta callback, alleghiamo un handler su window che,
  // se il toast è visibile e l'utente tocca, annulla l'ultima eliminazione.
  async function undoDelete(): Promise<void> {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    const { dream } = pendingDelete;
    pendingDelete = null;
    const { dreamRepo } = await getDbClient();
    try {
      await dreamRepo.restore(dream.id);
      dreamsStore.restore(dream);
      showToast(t('detail.ripristinato_toast'));
    } catch {
      showToast(t('alba.errore_generico'));
    }
  }

  function onToastTap(): void {
    if (pendingDelete) undoDelete();
  }

  // ---- Search overlay ----
  let searchOpen = $state(false);
  function openSearch(): void {
    searchOpen = true;
  }
  function closeSearch(): void {
    searchOpen = false;
  }
  function pickFromSearch(dream: Dream): void {
    searchOpen = false;
    selected = dream;
  }
</script>

<svelte:window onclick={onToastTap} />

<svelte:head>
  <title>Giardino — Vigilia</title>
</svelte:head>

<div class="giardino">
  {#if dreams.length > 0}
    <header class="head">
      <div class="eyebrow">{t('giardino.eyebrow')}</div>
      <div class="title-row">
        <h1>
          {dreamsThisMoon}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <em>{dreamsThisMoon === 1 ? t('giardino.titolo_singolare') : t('giardino.titolo')}</em><br />
          {t('giardino.titolo_questa')}
        </h1>
        <div class="head-actions">
          <button class="icon-btn" type="button" aria-label={t('giardino.cerca')} onclick={openSearch}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          <button
            class="icon-btn"
            type="button"
            aria-label={t('giardino.impostazioni')}
            onclick={() => goto('/impostazioni')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  {:else}
    <!-- Stato vuoto: nav ridotta (solo impostazioni, la ricerca non serve
         ancora). Header dedicato per evitare overlap con il CTA centrato. -->
    <header class="head empty-head">
      <button
        class="icon-btn"
        type="button"
        aria-label={t('giardino.impostazioni')}
        onclick={() => goto('/impostazioni')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
    </header>
  {/if}

  {#if dreams.length === 0}
    <!-- Stato vuoto -->
    <div class="empty">
      <div class="seed" aria-hidden="true"></div>
      <p class="empty-msg">{t('giardino.vuoto')}</p>
      <button class="empty-cta" type="button" onclick={() => goto('/alba')}>
        {t('giardino.vuoto_cta')}
      </button>
    </div>
  {:else}
    <!-- Mese filter chips (solo se paginati) -->
    {#if paginated && moons.length > 1}
      <div class="moons">
        {#each moons as m (m.key)}
          <button
            class="moon-chip"
            class:on={m.key === activeMoon}
            type="button"
            onclick={() => (activeMoon = m.key)}
          >
            {m.label}
          </button>
        {/each}
      </div>
    {/if}

    <canvas
      bind:this={canvas}
      class="garden"
      tabindex="0"
      aria-label={t('giardino.eyebrow')}
      onclick={onCanvasClick}
      onmousemove={onCanvasMove}
      onmouseleave={() => {
        hoverIndex = -1;
        if (canvas) canvas.style.cursor = 'default';
      }}
    ></canvas>

    <div class="hint">{t('giardino.hint')}</div>
  {/if}
</div>

<DreamDetail
  dream={selected}
  allDreams={dreams}
  onclose={closeDetail}
  onedit={editDream}
  ondelete={deleteDream}
/>

{#if searchOpen}
  <SearchOverlay onclose={closeSearch} onpick={pickFromSearch} />
{/if}

<style>
  .giardino {
    position: relative;
    min-height: 100%;
  }
  .head {
    position: relative;
    z-index: 2;
  }
  .eyebrow {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-top: 8px;
  }
  h1 {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 34px;
    line-height: 1.12;
    margin: 0;
    flex: 1;
    text-transform: lowercase;
  }
  h1 em {
    font-style: italic;
    color: var(--lm-violet);
    text-transform: lowercase;
  }
  .head-actions {
    display: flex;
    gap: 8px;
    flex: none;
    padding-top: 6px;
  }
  .icon-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid rgba(139, 136, 166, 0.3);
    background: rgba(20, 20, 48, 0.5);
    color: var(--lm-ink-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.4s var(--lm-ease);
  }
  .icon-btn:hover {
    border-color: var(--lm-cyan);
    color: var(--lm-cyan);
  }
  .icon-btn svg {
    width: 17px;
    height: 17px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* `.moons` — chip per luna (scroll-snap orizzontale). */
  .moons {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin-top: 18px;
    padding-bottom: 6px;
    scrollbar-width: none;
    z-index: 2;
    position: relative;
  }
  .moons::-webkit-scrollbar {
    display: none;
  }
  .moon-chip {
    flex: none;
    scroll-snap-align: start;
    padding: 8px 16px;
    border-radius: 40% 60% 55% 45% / 60% 40% 60% 40%;
    border: 1px solid rgba(139, 136, 166, 0.3);
    background: none;
    color: var(--lm-ink-dim);
    font-family: var(--lm-font-sans);
    font-size: 12.5px;
    cursor: pointer;
    transition: all 0.4s var(--lm-ease);
    text-transform: lowercase;
  }
  .moon-chip.on {
    color: var(--lm-bg0);
    background: var(--lm-cyan);
    border-color: transparent;
    font-weight: 500;
  }

  /* `#gardenCanvas` (riga 31 prototipo): sotto header, full-width. */
  .garden {
    position: absolute;
    left: 0;
    right: 0;
    top: 150px;
    width: 100%;
    height: calc(100% - 285px);
    cursor: pointer;
    z-index: 1;
  }
  /* Quando ci sono le chip mese, il canvas parte più in basso. */
  .giardino:has(.moons) .garden {
    top: 205px;
  }

  .hint {
    position: absolute;
    bottom: 18px;
    left: 0;
    right: 0;
    text-align: center;
    font-family: var(--lm-font-sans);
    font-size: 11.5px;
    letter-spacing: 0.14em;
    color: var(--lm-ink-faint);
    pointer-events: none;
    z-index: 2;
    animation: fadePulse var(--lm-keyframe-fade-pulse, 5000ms) ease-in-out infinite;
  }
  @keyframes fadePulse {
    0%,
    100% {
      opacity: 0.45;
    }
    50% {
      opacity: 0.95;
    }
  }

  /* Header nello stato vuoto: solo icona impostazioni, allineata a destra. */
  .empty-head {
    display: flex;
    justify-content: flex-end;
  }

  /* Seme dormiente: unico elemento visivo nello stato vuoto (anti-slop:
     un'immagine, non solo testo). Radial che respira piano. */
  .seed {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(circle at 42% 38%, rgba(182, 156, 255, 0.55), rgba(182, 156, 255, 0.12) 55%, transparent 72%);
    filter: blur(1px);
    animation: seedBreathe 6s ease-in-out infinite;
    margin-bottom: 6px;
  }
  @keyframes seedBreathe {
    0%,
    100% {
      transform: scale(0.92);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.06);
      opacity: 1;
    }
  }

  /* Stato vuoto. */
  .empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 40px;
    z-index: 2;
  }
  .empty-msg {
    font-family: var(--lm-font-serif);
    font-size: 22px;
    font-weight: 340;
    line-height: 1.4;
    color: var(--lm-ink-dim);
    margin: 0 0 28px;
  }
  .empty-cta {
    padding: 14px 30px;
    border-radius: 60px;
    border: none;
    background: linear-gradient(120deg, var(--lm-violet), var(--lm-cyan));
    color: #0a0a14;
    font-family: var(--lm-font-sans);
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: transform 0.3s var(--lm-ease);
  }
  .empty-cta:active {
    transform: scale(0.97);
  }

  /* Desktop: il giardino è la vetrina — più largo delle altre pagine. */
  @media (min-width: 900px) {
    .giardino {
      max-width: 1100px;
    }
    .garden {
      top: 190px;
      height: calc(100% - 330px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hint,
    .seed {
      animation: none;
    }
  }
</style>
