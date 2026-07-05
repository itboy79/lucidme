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
    const onResize = () => {
      starPts = initStars(canvas);
    };
    window.addEventListener('resize', onResize);

    const loop = (time: number) => {
      const sc = canvas.getContext('2d');
      if (!sc) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const sr = canvas.getBoundingClientRect();
      sc.clearRect(0, 0, sr.width, sr.height);
      for (const p of starPts) {
        const a = 0.15 + Math.abs(Math.sin(time * 0.0006 + p.p)) * 0.5;
        sc.beginPath();
        sc.arc(p.x, p.y, p.s, 0, 7);
        sc.fillStyle = `rgba(232,230,242,${a})`;
        sc.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
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
