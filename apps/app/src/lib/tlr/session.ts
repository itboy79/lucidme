/**
 * TLRSession — training audio TLR (§S4-4).
 *
 * Sessione di 20 min:
 *  - intro opzionale (3 min, `/audio/tlr/session-intro.mp3`): tono calmo,
 *    guida l'utente nell'associazione cue → stato lucido;
 *  - silenzio con cue ogni 90s ± 15s jitter (deterministico via seed);
 *    il cue è `/audio/tlr/cue.mp3` (~2s);
 *  - Web Audio API: precarichiamo il cue una volta, lo riproduciamo on-demand.
 *
 * `tlr_done = true` è marcato SOLO se ≥ 15 min completati.
 *
 * CUE DURANTE IL SONNO (post-sessione, riproduzione in background notturno) =
 * FASE 2 (F2-2). In v1 il cue suona SOLO durante la sessione da svegli. Non
 * tentare implementazioni notturne in background: annotato, deciso, chiuso.
 *
 * Interruzioni: una telefonata o chiusura pagina → `stop()` pulisce i timer e
 * rilascia le risorse Web Audio. Il `onProgress` callback riceve {elapsedMin,
 * cueCount, completed}. Documentato: su interruzione la sessione è considerata
 * "completata" solo se ha superato i 15 min al momento dello stop.
 */
import { mulberry32, hashStr } from '@lucidme/generative';

/** Path degli asset audio (non bundled, referenziati). */
import { withBase } from '$lib/navigation';

export const TLR_CUE_URL = withBase('/audio/tlr/cue.mp3');
export const TLR_INTRO_URL = withBase('/audio/tlr/session-intro.mp3');

/** Durate (ms). */
const INTRO_MS = 3 * 60 * 1000; // 3 min
const TOTAL_MS = 20 * 60 * 1000; // 20 min
const CUE_BASE_MS = 90 * 1000; // ogni 90s
const CUE_JITTER_MS = 15 * 1000; // ± 15s
const COMPLETION_THRESHOLD_MS = 15 * 60 * 1000; // ≥ 15 min → done

/** Stato di avanzamento notificato al callback. */
export interface TLRProgress {
  /** Minuti trascorsi (interi). */
  elapsedMin: number;
  /** Numero di cue riprodotti. */
  cueCount: number;
  /** True se la soglia di completamento (15 min) è raggiunta. */
  completed: boolean;
  /** True se la sessione è ancora attiva. */
  running: boolean;
}

/** Callback di progresso. */
export type ProgressCb = (p: TLRProgress) => void;

/**
 * Sessione TLR. Costruttore prende opzioni (per testabilità: seed, clock).
 * `seed` rende la sequenza di jitter deterministica (default fisso).
 */
export class TLRSession {
  private audioCtx: AudioContext | null = null;
  private cueBuffer: AudioBuffer | null = null;
  private introBuffer: AudioBuffer | null = null;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private startTime = 0;
  private cueCount = 0;
  private running = false;
  private progressCb: ProgressCb | null = null;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private readonly rnd: () => number;
  private readonly withIntro: boolean;

  constructor(opts?: { seed?: number; withIntro?: boolean }) {
    this.rnd = mulberry32(opts?.seed ?? hashStr('tlr-session'));
    this.withIntro = opts?.withIntro ?? true;
  }

  /**
   * Avvia la sessione: precarica i buffer audio, poi programma cue e intro.
   * `onProgress(cb)` è registrato prima dell'avvio.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now();
    this.cueCount = 0;

    // Web Audio: crea contesto e precarica il cue (best-effort; se manca, cue
    // silente — la sessione conta comunque i "tentativi").
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        this.audioCtx = new Ctx();
        this.cueBuffer = await this.loadBuffer(TLR_CUE_URL);
        if (this.withIntro) {
          this.introBuffer = await this.loadBuffer(TLR_INTRO_URL);
        }
      }
    } catch {
      // Web Audio non disponibile → cue silenziosi (sessione "simbolica").
      this.audioCtx = null;
    }

    // Intro (se presente e caricato): riproduzione in foreground.
    if (this.introBuffer && this.audioCtx) {
      this.playBuffer(this.introBuffer, this.audioCtx);
    }

    // Programma i cue: primo cue dopo INTRO_MS + jitter, poi ogni ~90s ± jitter.
    this.scheduleCues();

    // Tick di progresso ogni 1s.
    this.tickHandle = setInterval(() => this.emitProgress(), 1000);

    // Stop automatico a TOTAL_MS.
    const endTimeout = setTimeout(() => {
      void this.stop();
    }, TOTAL_MS);
    this.timeouts.push(endTimeout);

    this.emitProgress();
  }

  /** Ferma la sessione, rilascia risorse, eme l'ultimo progresso. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    try {
      void this.audioCtx?.close();
    } catch {
      /* no-op */
    }
    this.audioCtx = null;
    this.emitProgress();
  }

  /** Registra il callback di progresso. */
  onProgress(cb: ProgressCb): void {
    this.progressCb = cb;
  }

  /** True se ≥ 15 min completati (soglia per tlr_done). */
  isCompleted(): boolean {
    return this.elapsedMs() >= COMPLETION_THRESHOLD_MS;
  }

  /** Minuti trascorsi (interi). */
  get elapsedMin(): number {
    return Math.floor(this.elapsedMs() / 60000);
  }

  /** Numero di cue riprodotti. */
  get cueCountValue(): number {
    return this.cueCount;
  }

  // --- internals ---

  private elapsedMs(): number {
    return this.running ? Date.now() - this.startTime : 0;
  }

  private scheduleCues(): void {
    // Sequenza deterministica di offset (ms) a partire da INTRO_MS.
    let t = INTRO_MS;
    while (t < TOTAL_MS) {
      // jitter ± CUE_JITTER_MS via PRNG uniforme
      const jitter = (this.rnd() * 2 - 1) * CUE_JITTER_MS;
      const cueAt = Math.max(INTRO_MS, t + jitter);
      const cueCount = this.cueCountSnapshot();
      const to = setTimeout(() => {
        this.cueCount += 1;
        this.playCue();
      }, cueAt);
      this.timeouts.push(to);
      void cueCount;
      t += CUE_BASE_MS;
    }
  }

  /** Snapshot del cueCount per evitare closure capturing (no-op, readability). */
  private cueCountSnapshot(): number {
    return this.cueCount;
  }

  private playCue(): void {
    if (this.cueBuffer && this.audioCtx) {
      this.playBuffer(this.cueBuffer, this.audioCtx);
    }
  }

  private playBuffer(buf: AudioBuffer, ctx: AudioContext): void {
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch {
      /* no-op */
    }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.audioCtx) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return await this.audioCtx.decodeAudioData(arr);
    } catch {
      return null;
    }
  }

  private emitProgress(): void {
    if (!this.progressCb) return;
    const elapsedMs = this.elapsedMs();
    this.progressCb({
      elapsedMin: Math.floor(elapsedMs / 60000),
      cueCount: this.cueCount,
      completed: elapsedMs >= COMPLETION_THRESHOLD_MS,
      running: this.running,
    });
  }
}

/** Soglia di completamento in minuti (per la UI). */
export const TLR_COMPLETION_MIN = COMPLETION_THRESHOLD_MS / 60000;
/** Durata totale in minuti. */
export const TLR_TOTAL_MIN = TOTAL_MS / 60000;
