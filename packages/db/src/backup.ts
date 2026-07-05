/**
 * Backup / export (§S2-2).
 *
 * - `exportJSON`: payload versionato con tutti i sogni (incl. soft-deleted,
 *   così il backup è completo) e i sign.
 * - `exportMarkdown`: un unico documento, una sezione per sogno.
 * - `importJSON`: validazione shape + idempotenza su `id` (skip se esiste già).
 *
 * Privacy (§8.5.4): nessun log di body/title; gli errori di import riportano
 * solo l'id o l'indice.
 *
 * NOTA: la validazione è hand-rolled (no `zod`) per evitare una dipendenza
 * esterna in questo step del monorepo. Lo shape è piccolo e fisso; se cresce,
 * swappare a `zod` (già in `package.json`) richiede solo di sostituire
 * `validateExportPayload`.
 */
import type { Dream, DreamSign, Emotion, Lucidity } from '@lucidme/core';
import { EMOTIONS, LUCIDITY_LEVELS } from '@lucidme/core';
import type { DreamRepo } from './repositories/dream-repo.js';
import type { SignRepo } from './repositories/sign-repo.js';

/** Shape del payload di export v1. */
export interface ExportPayload {
  version: 1;
  exportedAt: string;
  dreams: Dream[];
  signs: DreamSign[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMOTION_SET = new Set<Emotion>(EMOTIONS);
const LUCIDITY_SET = new Set<Lucidity>(LUCIDITY_LEVELS);

/**
 * Valida il payload di export. Restituisce un messaggio di errore leggibile
 * (mai contenente body/title) o `null` se valido.
 */
export function validateExportPayload(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return 'payload non è un oggetto';
  }
  const p = payload as Record<string, unknown>;
  if (p.version !== 1) return 'version non è 1';
  if (typeof p.exportedAt !== 'string') return 'exportedAt non è una stringa';
  if (!Array.isArray(p.dreams)) return 'dreams non è un array';
  if (!Array.isArray(p.signs)) return 'signs non è un array';

  for (let i = 0; i < p.dreams.length; i++) {
    const d = p.dreams[i];
    const ctx = `dreams[${i}]`;
    const err = validateDream(d, ctx);
    if (err) return err;
  }
  for (let i = 0; i < p.signs.length; i++) {
    const s = p.signs[i];
    const ctx = `signs[${i}]`;
    const err = validateSign(s, ctx);
    if (err) return err;
  }
  return null;
}

function validateDream(d: unknown, ctx: string): string | null {
  if (typeof d !== 'object' || d === null) return `${ctx}: non è un oggetto`;
  const x = d as Record<string, unknown>;
  if (typeof x.id !== 'string' || x.id === '') return `${ctx}: id mancante`;
  if (typeof x.createdAt !== 'string') return `${ctx}: createdAt non valido`;
  if (typeof x.dreamedOn !== 'string' || !DATE_RE.test(x.dreamedOn)) {
    return `${ctx}: dreamedOn non è YYYY-MM-DD`;
  }
  if (typeof x.title !== 'string') return `${ctx}: title non valido`;
  if (typeof x.body !== 'string') return `${ctx}: body non valido`;
  if (typeof x.emotion !== 'string' || !EMOTION_SET.has(x.emotion as Emotion)) {
    return `${ctx}: emotion non valida`;
  }
  if (typeof x.lucidity !== 'number' || !LUCIDITY_SET.has(x.lucidity as Lucidity)) {
    return `${ctx}: lucidity fuori range 0..3`;
  }
  if (typeof x.seed !== 'string') return `${ctx}: seed non valido`;
  if (x.deletedAt !== null && typeof x.deletedAt !== 'string') {
    return `${ctx}: deletedAt non valido (null o stringa)`;
  }
  return null;
}

function validateSign(s: unknown, ctx: string): string | null {
  if (typeof s !== 'object' || s === null) return `${ctx}: non è un oggetto`;
  const x = s as Record<string, unknown>;
  if (typeof x.id !== 'string' || x.id === '') return `${ctx}: id mancante`;
  if (typeof x.label !== 'string' || x.label === '') return `${ctx}: label mancante`;
  if (typeof x.autoDetected !== 'boolean') return `${ctx}: autoDetected non boolean`;
  return null;
}

/**
 * Esporta tutti i sogni (incl. soft-deleted) e i sign in un payload JSON.
 */
export async function exportJSON(
  repo: DreamRepo,
  signRepo?: SignRepo,
): Promise<ExportPayload> {
  const dreams = await repo.listAll({ includeDeleted: true });
  const signs = signRepo ? await signRepo.list() : [];
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    dreams,
    signs,
  };
}

/**
 * Esporta in Markdown: un documento, una sezione `##` per sogno.
 * Header: `## {title}`, meta `*{dreamedOn} · {emotion} · {lucidityLabel}*`,
 * poi body.
 */
export function exportMarkdown(dreams: Dream[]): string {
  // import ritardato per evitare dipendenza circolare con le label costanti
  // (in realtà non c'è, ma teniamo l'import esplicito qui per chiarezza)
  return dreams.map(markdownSection).join('\n');
}

function markdownSection(d: Dream): string {
  const label = lucidityLabel(d.lucidity);
  const meta = `*${d.dreamedOn} · ${d.emotion} · ${label}*`;
  return `## ${d.title}\n\n${meta}\n\n${d.body}\n`;
}

/** Etichetta italiana del livello di lucidità, importata da core. */
function lucidityLabel(l: Lucidity): string {
  // LUCIDITY_LABELS è indicizzato 0..3; import dinamico per non ciclare.
  // Usiamo una copia locale allineata a @lucidme/core per evitare un import
  // di un valore che poi non useremmo altrove; in caso di mismatch il test lo
  // cattura. (Allineato: 0 non lucido, 1 barlume, 2 lucido, 3 pieno controllo.)
  const labels = ['non lucido', 'barlume', 'lucido', 'pieno controllo'];
  return labels[l] ?? 'non lucido';
}

/**
 * Importa un payload JSON. Valida lo shape. Idempotente: salta i sogni il cui
 * `id` esiste già (no upsert, no overwrite). Restituisce conteggi.
 */
export async function importJSON(
  payload: unknown,
  repo: DreamRepo,
): Promise<{ inserted: number; skipped: number }> {
  const err = validateExportPayload(payload);
  if (err) {
    throw new Error(`payload di import non valido: ${err}`);
  }
  const data = payload as ExportPayload;

  let inserted = 0;
  let skipped = 0;
  for (const d of data.dreams) {
    const existing = await repo.getById(d.id);
    if (existing) {
      skipped++;
      continue;
    }
    await repo.insert(d);
    inserted++;
  }
  return { inserted, skipped };
}
