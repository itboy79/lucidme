<!--
  TrendChart.svelte — grafico trend Lume (porta lumeChart del prototipo, riga 372-384).
  Linea smoothed (cubic-bezier) con gradient #565370 → #7fe7dc, pallini, label asse X.
  Ultimo punto evidenziato (più grande, cyan pieno).

  Prop:
   - data: number[] (valori y, es. lucidCount per settimana)
   - labels: string[] (etichette asse x, lunghezza uguale a data)
   - height: px del viewBox (default 90, come prototipo)
-->
<script lang="ts">
  interface Props {
    data: number[];
    labels: string[];
    height?: number;
  }
  let { data, labels, height = 90 }: Props = $props();

  const WIDTH = 340;
  const PAD_X = 20;
  const PAD_Y_TOP = 8;
  const PAD_Y_BOTTOM = 14;

  // Normalizza y in [0, max] mappato su [PAD_Y_TOP, height - PAD_Y_BOTTOM].
  const max = $derived(Math.max(1, ...data));
  const points = $derived(
    data.map((v, i) => {
      const x = data.length > 1 ? PAD_X + (i * (WIDTH - 2 * PAD_X)) / (data.length - 1) : WIDTH / 2;
      const y = height - PAD_Y_BOTTOM - (v / max) * (height - PAD_Y_TOP - PAD_Y_BOTTOM);
      return { x, y };
    }),
  );

  // Path smoothed con cubic-bezier (come prototipo: C cp1x,cp1y cp2x,cp2y x,y).
  const pathD = $derived(buildSmoothPath(points));
  const areaD = $derived(
    points.length > 0
      ? `${pathD} L ${points[points.length - 1]?.x ?? 0},${height - PAD_Y_BOTTOM} L ${points[0]?.x ?? 0},${height - PAD_Y_BOTTOM} Z`
      : '',
  );

  function buildSmoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M${pts[0]?.x},${pts[0]?.y}`;
    let d = `M${pts[0]?.x},${pts[0]?.y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[i - 1];
      if (!p || !q) continue;
      const cpX = (q.x + p.x) / 2;
      d += ` C${cpX},${q.y} ${cpX},${p.y} ${p.x},${p.y}`;
    }
    return d;
  }

  // Unique id per il gradient (evita collisioni se più chart in pagina).
  const gid = `lm-trend-${Math.random().toString(36).slice(2, 9)}`;
</script>

<svg viewBox="0 0 {WIDTH} {height}" preserveAspectRatio="none" class="trend" role="img" aria-label="Trend settimanale">
  <defs>
    <linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#565370" />
      <stop offset="100%" stop-color="#7fe7dc" />
    </linearGradient>
    <linearGradient id="{gid}-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7fe7dc" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#7fe7dc" stop-opacity="0" />
    </linearGradient>
  </defs>

  {#if areaD}
    <path d={areaD} fill="url(#{gid}-area)" />
  {/if}
  {#if pathD}
    <path d={pathD} fill="none" stroke="url(#{gid})" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
  {/if}

  {#each points as p, i}
    <circle
      cx={p.x}
      cy={p.y}
      r={i === points.length - 1 ? 5 : 3}
      fill={i === points.length - 1 ? '#7fe7dc' : '#565370'}
    />
  {/each}

  {#each labels as label, i}
    {#if points[i]}
      <text x={points[i]?.x} y={height - 2} text-anchor="middle" font-size="9" fill="#565370" font-family="Outfit, sans-serif">{label}</text>
    {/if}
  {/each}
</svg>

<style>
  .trend {
    width: 100%;
    display: block;
  }
</style>
