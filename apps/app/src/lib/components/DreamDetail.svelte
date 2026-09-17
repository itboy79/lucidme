<!--
  DreamDetail.svelte — overlay di dettaglio sogno (port del `#detail` del
  prototipo, righe 195-201 + 100-107).

  Composizione:
   - backdrop blur (rgba(5,5,12,.55) + backdrop-filter blur 26px)
   - canvas organismo animato (renderFrame)
   - titolo (serif), meta (data · emozione · lucidità), body
   - chip dei segni ricorrenti che compaiono in questo sogno (S2-6)
   - azioni: Modifica → /alba?edit=<id>; Elimina → soft delete + toast UNDO 5s

  Props:
    dream: Dream | null            — il sogno da mostrare (null = chiuso).
    allDreams: Dream[]             — tutti i sogni, per detectSigns (S2-6).
    onclose: () => void
    onedit: (id: string) => void   — naviga ad Alba edit mode.
    ondelete: (dream: Dream) => void  — soft delete (caller gestisce undo).
-->
<script lang="ts">
  import type { Dream } from '@lucidme/core';
  import { detectSigns, tokenize, LUCIDITY_LABELS } from '@lucidme/core';
  import type { SignHit } from '@lucidme/core';
  import { renderFrame } from '@lucidme/generative';
  import type { OrganismParams } from '@lucidme/generative';
  import { t } from '@lucidme/ui';
  import { fitCanvas, observeResize } from '../canvas.js';
  import { formatDreamDate } from '../date.js';

  interface Props {
    dream: Dream | null;
    allDreams: Dream[];
    onclose: () => void;
    onedit: (id: string) => void;
    ondelete: (dream: Dream) => void;
  }
  let { dream, allDreams, onclose, onedit, ondelete }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let raf = 0;

  // Sottoinsieme di segni che compaiono nel body di QUESTO sogno (S2-6):
  // ricalcolato quando cambia dream/allDreams.
  const signsForDream = $derived.by<SignHit[]>(() => {
    const d = dream;
    if (!d) return [];
    const tokens = new Set(tokenize(d.body));
    const hits = detectSigns(allDreams);
    return hits.filter((h) => tokens.has(h.label));
  });

  // Parametri organismo per renderFrame.
  const params = $derived.by<OrganismParams | null>(() => {
    const d = dream;
    if (!d) return null;
    return { seed: d.seed, emotion: d.emotion, lucidity: d.lucidity };
  });

  const meta = $derived.by(() => {
    const d = dream;
    if (!d) return '';
    const label = LUCIDITY_LABELS[d.lucidity] ?? 'non lucido';
    return `${formatDreamDate(d.dreamedOn)} · ${d.emotion} · ${label}`;
  });

  // Loop di animazione: parte quando il canvas è montato e c'è un dream.
  $effect(() => {
    if (!canvas || !dream) return;
    const c = canvas;
    fitCanvas(c);
    const handle = observeResize(c, (el) => fitCanvas(el));

    const loop = (time: number) => {
      const ctx = c.getContext('2d');
      const rect = c.getBoundingClientRect();
      if (ctx && params) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        const r = Math.min(rect.width, rect.height) * 0.36;
        renderFrame(ctx, params, rect.width / 2, rect.height / 2, r, time);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      handle.disconnect();
    };
  });

  function handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && dream) onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if dream}
  <div class="detail open" role="dialog" aria-modal="true" aria-label={dream.title}>
    <button class="dclose" type="button" aria-label={t('detail.close')} onclick={onclose}>
      ✕
    </button>

    <canvas bind:this={canvas} class="dcanvas" aria-hidden="true"></canvas>

    <h2 class="dtitle">{dream.title}</h2>
    <div class="dmeta">
      {meta}
      {#if dream.noRecall}
        <span class="drecall">{t('detail.no_recall')}</span>
      {/if}
    </div>

    {#if signsForDream.length > 0}
      <div class="field-label">{t('detail.signs_label')}</div>
      <div class="signs">
        {#each signsForDream as s (s.label)}
          <span class="sign">{s.label} <b>×{s.count}</b></span>
        {/each}
      </div>
    {/if}

    <div class="dbody">{dream.body}</div>

    <div class="actions">
      <button class="act ghost" type="button" onclick={() => onedit(dream.id)}>
        {t('detail.modifica')}
      </button>
      <button class="act danger" type="button" onclick={() => ondelete(dream)}>
        {t('detail.elimina')}
      </button>
    </div>
  </div>
{/if}

<style>
  /* `#detail` + `.open` del prototipo (righe 100-102). */
  .detail {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(5, 5, 12, 0.55);
    -webkit-backdrop-filter: blur(26px);
    backdrop-filter: blur(26px);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 70px 30px 48px;
    overflow-y: auto;
    scrollbar-width: none;
    animation: detailFade var(--lm-duration-detail-fade, 600ms) var(--lm-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
  }
  .detail::-webkit-scrollbar {
    display: none;
  }
  @keyframes detailFade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dclose {
    position: absolute;
    top: 22px;
    right: 24px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(139, 136, 166, 0.3);
    background: none;
    color: var(--lm-ink-dim);
    font-size: 17px;
    cursor: pointer;
  }

  /* `#detailCanvas` (riga 103): 170×170 centrato. */
  .dcanvas {
    width: 170px;
    height: 170px;
    align-self: center;
    flex: none;
  }

  /* `#dTitle` (riga 104). */
  .dtitle {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 27px;
    line-height: 1.2;
    text-align: center;
    margin: 10px 0 0;
    color: var(--lm-ink);
    word-break: break-word;
  }

  /* `#dMeta` (riga 105). */
  .dmeta {
    text-align: center;
    font-family: var(--lm-font-sans);
    font-size: 11.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin-top: 10px;
  }

  /* Badge discreto per entry "non ricordo il sogno" (S8-2): resetta
     uppercase/letter-spacing della meta, bordo puntinato come altri dettagli. */
  .drecall {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    font-style: italic;
    font-size: 11px;
    letter-spacing: normal;
    text-transform: none;
    color: var(--lm-ink-faint);
    border: 1px dotted rgba(139, 136, 166, 0.4);
    border-radius: 8px;
  }

  .field-label {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin: 24px 0 10px;
    text-align: center;
  }

  /* `.sign` + `.sign b` (riga 94-95) — chip non-interattivi (v1). */
  .signs {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    justify-content: center;
    margin-top: 4px;
  }
  .sign {
    padding: 8px 15px;
    font-size: 12.5px;
    color: var(--lm-violet);
    border: 1px solid rgba(182, 156, 255, 0.3);
    border-radius: var(--lm-radius-sign);
    background: rgba(182, 156, 255, 0.06);
    font-family: var(--lm-font-sans);
  }
  .sign b {
    font-weight: 500;
    color: var(--lm-ink);
  }

  /* `#dBody` (riga 106). */
  .dbody {
    font-family: var(--lm-font-sans);
    font-size: 15px;
    font-weight: 300;
    line-height: 1.75;
    color: var(--lm-ink-dim);
    margin-top: 24px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .actions {
    display: flex;
    gap: 12px;
    margin-top: 28px;
    justify-content: center;
  }
  .act {
    font-family: var(--lm-font-sans);
    cursor: pointer;
    padding: 12px 26px;
    border-radius: 50px;
    font-size: 13px;
    letter-spacing: 0.08em;
    transition:
      transform 0.3s var(--lm-ease),
      background 0.3s var(--lm-ease);
  }
  .act:active {
    transform: scale(0.97);
  }
  .ghost {
    border: 1px solid var(--lm-cyan);
    background: rgba(127, 231, 220, 0.08);
    color: var(--lm-cyan);
  }
  .danger {
    border: 1px solid rgba(255, 158, 198, 0.4);
    background: rgba(255, 158, 198, 0.06);
    color: var(--lm-rose);
  }

  @media (prefers-reduced-motion: reduce) {
    .detail {
      animation: none;
    }
  }
</style>
