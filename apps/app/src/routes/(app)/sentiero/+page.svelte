<!--
  Sentiero — percorso 21 giorni (§S3-3).

  Visual = Organico Generativo: path SVG a onda (prototipo riga 350-370),
  21 nodi-giorno. Nodi completati = cyan pieno. Nodo "oggi" = più grande con
  anello pulsante. Nodi futuri = bloccati (icona lucchetto soft, "Torna domani").
  Nodi passati = tappabili (rilettura read-only).

  Today card = Panel blob (prototipo riga 131-136): titolo, durata, fonte, CTA
  ghost "Inizia la pratica". Apre LessonPlayer.

  Regola §S3-3: un solo giorno completabile per giorno solare (timezone device).
  La regola è nel PathRepo; qui leggiamo stato e chiamiamo markComplete
  sull'oncomplete del player.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t, Panel, Button } from '@lucidme/ui';
  import { getDb, PathRepo, type PathProgress, PATH_MAX_DAY } from '@lucidme/db';
  import { PHASE_LABEL, type Lesson, type Phase } from '@lucidme/content';
  import LessonPlayer from '$lib/components/LessonPlayer.svelte';
  interface PhaseInfo { phase: Phase; dayRange: [number, number] }

  let { data } = $props<{ data: { lessons: Lesson[]; phases: PhaseInfo[] } }>();

  // --- stato progresso (idratato da DB) ---
  let currentDay = $state(1);
  let completedDays = $state<Set<number>>(new Set());
  let repo: PathRepo | null = $state(null);
  let loaded = $state(false);

  // --- stato player ---
  let activeLesson = $state<Lesson | null>(null);
  // se true, la lezione aperta è una rilettura (non marca completo)
  let readonlyReview = $state(false);

  async function refresh(): Promise<void> {
    if (!repo) return;
    const progress: PathProgress[] = await repo.getProgress();
    completedDays = new Set(progress.map((p) => p.day));
    currentDay = await repo.getCurrentDay();
    loaded = true;
  }

  onMount(async () => {
    const db = await getDb();
    repo = new PathRepo(db);
    await refresh();
  });

  // --- fase corrente (per h1 + tag path) ---
  const currentPhase = $derived.by<PhaseInfo>(() => {
    const ph = data.phases.find(
      (p: PhaseInfo) => currentDay >= p.dayRange[0] && currentDay <= p.dayRange[1],
    );
    return ph ?? data.phases[0];
  });

  const todayLesson = $derived<Lesson | null>(
    data.lessons.find((l: Lesson) => l.day === currentDay) ?? null,
  );

  // --- path SVG: 21 punti su onda sinusoidale (prototipo riga 353-355) ---
  const N = 21;
  interface Pt { x: number; y: number; i: number }
  const points: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    points.push({ x: 20 + u * 300, y: 110 + Math.sin(u * Math.PI * 2.2 + 1.2) * 62, i });
  }
  // path "d" con curve quadratiche che passano per i punti
  const pathD = (() => {
    let d = `M${points[0]?.x},${points[0]?.y}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const q = points[i - 1];
      if (!p || !q) continue;
      d += ` Q${(p.x + q.x) / 2},${q.y} ${p.x},${p.y}`;
    }
    return d;
  })();

  // stato di un nodo: 'done' | 'today' | 'locked'
  function nodeState(day: number): 'done' | 'today' | 'locked' {
    if (completedDays.has(day)) return 'done';
    if (day === currentDay) return 'today';
    return 'locked';
  }

  function onNodeClick(day: number): void {
    const st = nodeState(day);
    if (st === 'locked') return; // futuro: non apribile
    // today o done: apri in player (done = rilettura read-only)
    const lesson = data.lessons.find((l: Lesson) => l.day === day);
    if (!lesson) return;
    readonlyReview = st === 'done';
    activeLesson = lesson;
  }

  function onStart(): void {
    if (!todayLesson) return;
    readonlyReview = false;
    activeLesson = todayLesson;
  }

  async function onLessonComplete(): Promise<void> {
    // solo se non è rilettura: marca il progresso
    if (readonlyReview) {
      activeLesson = null;
      return;
    }
    if (!repo || !activeLesson) {
      activeLesson = null;
      return;
    }
    try {
      await repo.markComplete(activeLesson.day);
    } catch {
      // regola bloccante violata (es. stesso giorno solare): nessuna scrittura.
      // il toast di completamento è già stato mostrato dal player; qui non
      // rilanciamo per non rompere la UX.
    }
    await refresh();
    activeLesson = null;
  }

  function closePlayer(): void {
    activeLesson = null;
  }

  // etichetta fase per il tag SVG
  const phaseTagForX = (dayStart: number): number => {
    const p = points[dayStart - 1];
    return p ? p.x : 20;
  };
</script>

<div class="eyebrow">{t('sentiero.eyebrow_giorno', undefined, { n: currentDay })}</div>
<h1>
  {#if currentDay > PATH_MAX_DAY}
    {t('sentiero.finito_pre')}<br /><em>{t('sentiero.finito_em')}</em>
  {:else}
    {t('sentiero.h1_pre')}<br /><em>{t('sentiero.h1_em', undefined, { fase: PHASE_LABEL[currentPhase.phase] })}</em>
  {/if}
</h1>

<div class="path-wrap">
  <svg class="path-svg" viewBox="0 0 340 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Percorso di 21 giorni">
    <!-- tratteggiato del sentiero -->
    <path d={pathD} fill="none" stroke="rgba(139,136,166,.25)" stroke-width="1.4" stroke-dasharray="3 5" />

    <!-- tag delle fasi (in alto) -->
    {#each data.phases as ph}
      <text class="phase-tag" x={phaseTagForX(ph.dayRange[0])} y="20">
        {PHASE_LABEL[(ph as PhaseInfo).phase]}
      </text>
    {/each}

    <!-- nodi giorno -->
    {#each points as p, i}
      {@const day = i + 1}
      {@const st = nodeState(day)}
      {@const isToday = st === 'today'}
      {@const isDone = st === 'done'}
      <g
        class="day-node"
        class:clickable={st !== 'locked'}
        class:locked={st === 'locked'}
        role="button"
        tabindex={st === 'locked' ? -1 : 0}
        aria-label={`Giorno ${day}${st === 'locked' ? ' (bloccato)' : st === 'done' ? ' (completato)' : ' (oggi)'}`}
        onclick={() => onNodeClick(day)}
        onkeydown={(e) => e.key === 'Enter' && onNodeClick(day)}
      >
        <!-- anello pulsante sul nodo oggi -->
        {#if isToday}
          <circle cx={p.x} cy={p.y} r="15" fill="none" stroke="rgba(127,231,220,.35)" stroke-width="1">
            <animate attributeName="r" values="12;19;12" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values=".6;.1;.6" dur="4s" repeatCount="indefinite" />
          </circle>
        {/if}
        <circle
          cx={p.x}
          cy={p.y}
          r={isToday ? 9 : 4.5}
          fill={isDone ? 'rgba(127,231,220,.9)' : isToday ? 'url(#gToday)' : 'rgba(86,83,112,.6)'}
          stroke={isToday ? 'rgba(127,231,220,.6)' : 'none'}
          stroke-width={isToday ? 1.5 : 0}
        />
        {#if st === 'locked'}
          <!-- lucchetto soft: piccolo pallino sbarrato -->
          <text x={p.x} y={p.y + 2.5} text-anchor="middle" font-size="6" fill="rgba(86,83,112,.9)" font-family="sans-serif">🔒</text>
        {/if}
        <!-- numero giorno vicino al nodo oggi/completato -->
        {#if isToday || isDone}
          <text x={p.x} y={p.y - 14} text-anchor="middle" font-size="9" fill={isToday ? 'var(--lm-cyan, #7fe7dc)' : 'rgba(139,136,166,.6)'} font-family="sans-serif">{day}</text>
        {/if}
      </g>
    {/each}

    <defs>
      <radialGradient id="gToday">
        <stop offset="0%" stop-color="#eafffb" />
        <stop offset="100%" stop-color="#7fe7dc" />
      </radialGradient>
    </defs>
  </svg>

  {#if !loaded}
    <div class="loading">carico il tuo percorso…</div>
  {/if}
</div>

{#if todayLesson && currentDay <= PATH_MAX_DAY}
  <Panel variant="b2" class="today-card">
    <div class="t">Oggi: {todayLesson.title}</div>
    <div class="d">
      {#if todayLesson.sources.length > 0}
        <span class="src-line">{t('sentiero.player.fonte')}: {todayLesson.sources[0]?.label}</span>
      {/if}
    </div>
    <Button variant="ghost" onclick={onStart}>
      {currentDay === 1
        ? t('sentiero.inizia_primo', undefined, { min: todayLesson.durationMin })
        : t('sentiero.inizia', undefined, { min: todayLesson.durationMin })}
    </Button>
  </Panel>
{:else if loaded && currentDay > PATH_MAX_DAY}
  <Panel variant="b2" class="today-card">
    <div class="t">Hai completato i 21 giorni</div>
    <div class="d">Il Sentiero è finito, la pratica no. Continua con reality check e diario.</div>
  </Panel>
{/if}

{#if activeLesson}
  <LessonPlayer
    lesson={activeLesson}
    oncomplete={onLessonComplete}
    onclose={closePlayer}
  />
{/if}

<style>
  .eyebrow {
    font-family: var(--lm-font-sans);
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
  }
  h1 {
    font-family: var(--lm-font-serif);
    font-weight: 340;
    font-size: 34px;
    line-height: 1.12;
    margin: 8px 0 0;
  }
  h1 em {
    font-style: italic;
    color: var(--lm-violet);
  }
  .path-wrap {
    position: relative;
    margin-top: 22px;
  }
  .path-svg {
    width: 100%;
    display: block;
  }
  .phase-tag {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    fill: var(--lm-ink-faint);
    font-family: var(--lm-font-sans);
  }
  .day-node {
    cursor: default;
  }
  .day-node.clickable {
    cursor: pointer;
  }
  .day-node.locked {
    cursor: not-allowed;
    opacity: 0.85;
  }
  .loading {
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--lm-ink-faint);
    margin-top: -10px;
    animation: pulse 2.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.9;
    }
  }
  /* today-card eredita .blob dal Panel; gli elementi interni vivono nel DOM
     del child, per cui questi selettori sono globali (scoped per nome classe). */
  :global(.today-card) {
    margin-top: 14px;
  }
  :global(.today-card .t) {
    font-family: var(--lm-font-serif);
    font-size: 19px;
    font-weight: 400;
    margin-bottom: 6px;
  }
  :global(.today-card .d) {
    font-size: 13px;
    color: var(--lm-ink-dim);
    line-height: 1.55;
    font-weight: 300;
  }
  :global(.today-card .src-line) {
    display: inline-block;
    margin-top: 12px;
    font-size: 11px;
    color: var(--lm-cyan);
    border-bottom: 1px dotted rgba(127, 231, 220, 0.4);
    padding-bottom: 1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .loading {
      animation: none;
    }
  }
</style>
