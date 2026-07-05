<!--
  /dev/ui — catalogo vivo di tutti i componenti @lucidme/ui + output generativo.
  È il nostro "storybook". NON usa il layout (app): pagina standalone a sé.
-->
<script lang="ts">
  import {
    Nav,
    Panel,
    Button,
    EmotionPicker,
    LucidityPicker,
    TextEntry,
    Toast,
    showToast,
    t,
  } from '@lucidme/ui';
  import { toStaticSVG, gardenLayout } from '@lucidme/generative';
  import type { Emotion, Lucidity } from '@lucidme/core';

  // Stato interattivo per i selettori.
  let emotion = $state<Emotion | null>('meraviglia');
  let lucidity = $state<Lucidity>(2);
  let body = $state('');

  // Nav dimostrativa (stessa del layout).
  const items = [
    { id: 'giardino', label: t('nav.giardino'), icon: 'giardino' },
    { id: 'sentiero', label: t('nav.sentiero'), icon: 'sentiero' },
    { id: 'alba', label: t('nav.alba'), icon: 'alba' },
    { id: 'notte', label: t('nav.notte'), icon: 'notte' },
    { id: 'lume', label: t('nav.lume'), icon: 'lume' },
  ] as const;
  let activeNav = $state('giardino');

  // Anteprime generative: 5 organismi statici (SVG) con i fixture seed.
  const previews: { label: string; svg: string }[] = [
    { label: 'meraviglia/2', svg: toStaticSVG({ seed: 'La biblioteca sommersa', emotion: 'meraviglia', lucidity: 2 }, 120) },
    { label: 'gioia/3', svg: toStaticSVG({ seed: 'Volo basso sul grano', emotion: 'gioia', lucidity: 3 }, 120) },
    { label: 'malinconia/0', svg: toStaticSVG({ seed: 'Il treno senza fermate', emotion: 'malinconia', lucidity: 0 }, 120) },
    { label: 'paura/1', svg: toStaticSVG({ seed: 'La casa che respira', emotion: 'paura', lucidity: 1 }, 120) },
    { label: 'calma/1', svg: toStaticSVG({ seed: 'Marea in salotto', emotion: 'calma', lucidity: 1 }, 120) },
  ];

  // Layout giardino deterministico (demo).
  const layout = gardenLayout(
    previews.map((p) => ({ seed: p.label, lucidity: 2, bodyLen: 100 })),
    320,
    160,
  );
</script>

<svelte:head>
  <title>Lucid Me · dev/ui catalog</title>
</svelte:head>

<div class="catalog">
  <h1>Catalogo componenti</h1>
  <p class="sub">@lucidme/ui + @lucidme/generative — Step 1</p>

  <section>
    <h2>Nav</h2>
    <div class="demo nav-demo">
      <Nav {items} active={activeNav} onselect={(id) => (activeNav = id)} />
    </div>
  </section>

  <section>
    <h2>Panel (blob b1/b2/b3)</h2>
    <div class="row">
      <Panel variant="b1"><p>b1 — default</p></Panel>
      <Panel variant="b2"><p>b2</p></Panel>
      <Panel variant="b3"><p>b3</p></Panel>
    </div>
  </section>

  <section>
    <h2>Button</h2>
    <Button variant="primary" onclick={() => showToast('primary premuto')}>Primary · plant-btn</Button>
    <Button variant="ghost" onclick={() => showToast('ghost premuto')}>Ghost · start-btn</Button>
  </section>

  <section>
    <h2>EmotionPicker</h2>
    <div class="field-label">value = {emotion ?? 'null'}</div>
    <EmotionPicker value={emotion} onchange={(e) => (emotion = e)} />
  </section>

  <section>
    <h2>LucidityPicker</h2>
    <div class="field-label">value = {lucidity}</div>
    <LucidityPicker value={lucidity} onchange={(v) => (lucidity = v)} />
  </section>

  <section>
    <h2>TextEntry</h2>
    <TextEntry bind:value={body} placeholder="Scrivi il sogno…" />
    <div class="field-label">{body.length} caratteri</div>
  </section>

  <section>
    <h2>Toast</h2>
    <Button variant="ghost" onclick={() => showToast(t('alba.toast_piantato'))}>
      Mostra toast (2200ms)
    </Button>
  </section>

  <section>
    <h2>Generative · toStaticSVG</h2>
    <div class="row">
      {#each previews as p (p.label)}
        <figure>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html p.svg}
          <figcaption>{p.label}</figcaption>
        </figure>
      {/each}
    </div>
  </section>

  <section>
    <h2>Generative · gardenLayout (deterministico)</h2>
    <svg class="layout-svg" viewBox="0 0 320 160">
      {#each layout as pos, i (i)}
        <circle cx={pos.x} cy={pos.y} r={pos.size * 0.4} fill="rgba(127,231,220,.4)" />
      {/each}
    </svg>
  </section>

  <Toast />
</div>

<style>
  .catalog {
    max-width: 420px;
    margin: 0 auto;
    padding: 32px 20px 160px;
    color: var(--lm-ink);
    font-family: var(--lm-font-sans);
  }
  h1 {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 28px;
  }
  h2 {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 19px;
    margin: 28px 0 12px;
    color: var(--lm-ink);
  }
  .sub {
    color: var(--lm-ink-dim);
    font-size: 13px;
    font-weight: 300;
  }
  .row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .row :global(p) {
    margin: 0;
    font-size: 13px;
    color: var(--lm-ink-dim);
  }
  .demo {
    position: relative;
    height: 140px;
    border: 1px dashed rgba(139, 136, 166, 0.25);
    border-radius: 12px;
    overflow: hidden;
  }
  /* nav-demo: la Nav è position:absolute bottom; il .demo relativo la contiene. */
  .field-label {
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin: 12px 0;
  }
  figure {
    margin: 0;
    text-align: center;
  }
  figcaption {
    font-size: 10.5px;
    color: var(--lm-ink-faint);
    margin-top: 4px;
    letter-spacing: 0.1em;
  }
  .layout-svg {
    width: 100%;
    height: 160px;
    border: 1px dashed rgba(139, 136, 166, 0.25);
    border-radius: 12px;
  }
</style>
