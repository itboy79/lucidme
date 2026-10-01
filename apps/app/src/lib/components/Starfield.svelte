<!--
  Starfield.svelte — canvas di stelle di sfondo (port di `bgStars` del prototipo,
  righe 21, 286-289, 405-409). Stelle deterministiche (mulberry32(7)), 70 punti,
  ampiezza pulsante via sin(time). Opacity .8 come `#bgStars`.

  Mostrato dietro tutto (z-index negativo, pointer-events none).
  Si ridimensiona su window resize (come il prototipo).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { mulberry32 } from '@lucidme/generative';

  let canvas: HTMLCanvasElement;
  let raf = 0;

  interface Star {
    x: number;
    y: number;
    s: number;
    p: number;
  }

  function fitCanvas(c: HTMLCanvasElement): { width: number; height: number } {
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: r.width, height: r.height };
  }

  function initStars(c: HTMLCanvasElement): Star[] {
    const r = fitCanvas(c);
    const rnd = mulberry32(7);
    return Array.from({ length: 70 }, () => ({
      x: rnd() * r.width,
      y: rnd() * r.height,
      s: rnd() * 1.3 + 0.3,
      p: rnd() * 6,
    }));
  }

  onMount(() => {
    let starPts = initStars(canvas);
    // Parallasse col puntatore (SOLO desktop con pointer fine): il cielo si
    // sposta di pochi px verso il mouse — l'app risponde prima del primo tap.
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onResize = () => {
      starPts = initStars(canvas);
    };
    const onMove = (e: PointerEvent): void => {
      const r = canvas.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 14;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 10;
    };
    if (finePointer && !reduced) window.addEventListener('pointermove', onMove);
    window.addEventListener('resize', onResize);

    const loop = (time: number) => {
      const sc = canvas.getContext('2d');
      if (!sc) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const sr = canvas.getBoundingClientRect();
      sc.clearRect(0, 0, sr.width, sr.height);
      // easing verso il target di parallasse
      px += (tx - px) * 0.04;
      py += (ty - py) * 0.04;
      for (const p of starPts) {
        const a = 0.15 + Math.abs(Math.sin(time * 0.0006 + p.p)) * 0.5;
        const depth = 0.4 + p.s; // le stelle grandi si spostano un filo più
        sc.beginPath();
        sc.arc(p.x + px * depth, p.y + py * depth, p.s, 0, 7);
        sc.fillStyle = `rgba(232,230,242,${a})`;
        sc.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  });
</script>

<canvas bind:this={canvas} class="bgstars" aria-hidden="true"></canvas>

<style>
  .bgstars {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0.8;
    z-index: 0;
  }
</style>
