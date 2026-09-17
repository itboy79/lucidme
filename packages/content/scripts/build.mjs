#!/usr/bin/env node
/**
 * build.mjs — script di build del Sentiero (§S3-1, verifica).
 *
 * Auto-contenuto (zero dipendenze): reimplementation in JS puro della logica
 * che in `src/` è in TypeScript. Così `node scripts/build.mjs` funziona senza
 * `pnpm install` e senza compilatore TS — è il verino di pipeline che il
 * ticket chiede di poter eseguire direttamente.
 *
 * Path risolti relativamente a questo file:
 *   lessons/      → ../lessons/
 *   99-fonti.md   → ../wiki/99-fonti.md  (copiata nel repo: build self-contained)
 *   bundle.json   → ../src/bundle.json
 *
 * Se esiste ANCHE la wiki-os sibling (setup dev originale:
 * <root-repo>/../wiki-os/99-fonti.md), le due copie devono coincidere: se
 * divergono il build FALLISCE con l'istruzione di sync, così la copia
 * vendorizzata non marcia in silenzio.
 *
 * Exit codes: 0 = build OK, 1 = errore di validazione.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const lessonsDir = join(here, '..', 'lessons');
const extraDir = join(lessonsDir, 'extra');
const vendoredPath = join(here, '..', 'wiki', '99-fonti.md');
const wikiSiblingPath = join(here, '..', '..', '..', '..', 'wiki-os', '99-fonti.md');
const bundleOut = join(here, '..', 'src', 'bundle.json');

// ---------------------------------------------------------------------------
// 1. Slug + parse fonti
// ---------------------------------------------------------------------------
function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}
function authorYearKey(line) {
  const m = line.match(/^\s*([A-Za-zÀ-ÿ]+)\s+(?:et al\.?\s+)?(\d{4})\b/);
  return m ? `${slugify(m[1])}-${m[2]}` : null;
}
function parseWikiSources(markdown) {
  const keys = new Set();
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('- ')) continue;
    const body = line.slice(2).trim();
    const hasUrl = /https?:\/\//i.test(body);
    const hasYear = /\b(19|20)\d{2}\b/.test(body);
    if (!hasUrl && !hasYear) continue;
    const key = authorYearKey(body) ?? slugify(body.split(/[:·(]/)[0] ?? body);
    if (key !== '') keys.add(key);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// 2. Frontmatter parser (mirror di src/frontmatter.ts)
// ---------------------------------------------------------------------------
function unquote(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    const inner = t.slice(1, -1);
    if (t.startsWith('"')) return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return inner.replace(/''/g, "'");
  }
  return t;
}
function coerceScalar(raw) {
  const t = raw.trim();
  if (t === '') return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  const low = t.toLowerCase();
  if (low === 'true') return true;
  if (low === 'false') return false;
  if (low === 'null' || low === '~') return null;
  return unquote(raw);
}
function parseInlineValue(raw) {
  const t = raw.trim();
  if (t === '[]') return [];
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((p) => coerceScalar(p));
  }
  return coerceScalar(raw);
}
function indentOf(line) { const m = line.match(/^( *)/); return m ? m[1].length : 0; }
function isListItem(line) { return /^\s*-\s+/.test(line) || /^\s*-\s*$/.test(line); }
/** Indentazione della prossima riga non vuota a partire da `from`, o -1. */
function nextIndent(lines, from) {
  for (let j = from; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    return indentOf(lines[j]);
  }
  return -1;
}
function parseBlock(lines, start, baseIndent) {
  let i = start;
  if (i < lines.length && isListItem(lines[i])) {
    const arr = [];
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < baseIndent) break;
      if (ind === baseIndent && isListItem(line)) {
        const afterDash = line.replace(/^\s*-\s+/, '');
        const kv = afterDash.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
        if (kv) {
          const obj = {};
          const [, k, v] = kv;
          if (v.trim() === '') {
            const childInd = nextIndent(lines, i + 1);
            if (childInd < 0 || childInd <= ind) { i += 1; arr.push(obj); continue; }
            const r = parseBlock(lines, i + 1, childInd);
            obj[k] = r.value; i += 1 + r.consumed;
          } else {
            obj[k] = parseInlineValue(v); i += 1;
            while (i < lines.length) {
              const nl = lines[i]; const ni = indentOf(nl);
              if (ni <= ind) break;
              const nkv = nl.match(/^\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/);
              if (nkv) {
                const [, nk, nv] = nkv;
                if (nv.trim() === '') {
                  const ci = nextIndent(lines, i + 1);
                  obj[nk] = ci >= 0 && ci > ni ? parseBlock(lines, i + 1, ci).value : null;
                } else {
                  obj[nk] = parseInlineValue(nv);
                }
              }
              i += 1;
            }
          }
          arr.push(obj);
        } else {
          arr.push(coerceScalar(afterDash)); i += 1;
        }
      } else if (ind > baseIndent) { i += 1; } else { break; }
    }
    return { value: arr, consumed: i - start };
  }
  const obj = {};
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i += 1; continue; }
    const ind = indentOf(line);
    if (ind < baseIndent) break;
    if (ind > baseIndent) { i += 1; continue; }
    if (isListItem(line)) break;
    const kv = line.match(/^\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (!kv) { i += 1; continue; }
    const [, k, v] = kv;
    if (v.trim() === '') {
      const childInd = nextIndent(lines, i + 1);
      if (childInd < 0 || childInd <= baseIndent) { obj[k] = null; i += 1; }
      else { const r = parseBlock(lines, i + 1, childInd); obj[k] = r.value; i += 1 + r.consumed; }
    } else { obj[k] = parseInlineValue(v); i += 1; }
  }
  return { value: obj, consumed: i - start };
}
function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') throw new Error('frontmatter mancante');
  let end = -1;
  for (let i = 1; i < lines.length; i++) if (lines[i].trim() === '---') { end = i; break; }
  if (end === -1) throw new Error('frontmatter non terminato');
  const fmLines = lines.slice(1, end);
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  const { value } = parseBlock(fmLines, 0, 0);
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('frontmatter non è una mappa');
  return { data: value, body };
}

// ---------------------------------------------------------------------------
// 3. Validator (mirror di src/schema.ts validateLesson)
// ---------------------------------------------------------------------------
const PHASES = new Set(['fondamenti', 'reality-testing', 'mild-wbtb', 'tlr']);
const PRACTICE_TYPES = new Set(['lettura', 'esercizio', 'audio']);
const PHASE_ALIASES = { fondamenti: 'fondamenti', fondamenta: 'fondamenti' };
function normalizePhase(p) { return PHASE_ALIASES[p] ?? (PHASES.has(p) ? p : undefined); }
function validateLesson(lesson, knownSources) {
  const errors = [];
  if (typeof lesson !== 'object' || lesson === null) return ['non oggetto'];
  if (typeof lesson.day !== 'number' || !Number.isFinite(lesson.day)) {
    errors.push('day non numerico');
  } else {
    const d = lesson.day;
    const okMain = d >= 1 && d <= 21 && Number.isInteger(d);
    if (!okMain && d !== 7.5 && d !== 14.5) errors.push(`day=${d} non valido`);
  }
  if (!PHASES.has(lesson.phase) && normalizePhase(lesson.phase) === undefined) errors.push(`phase="${lesson.phase}" non valida`);
  if (normalizePhase(lesson.phase) !== undefined) lesson.phase = normalizePhase(lesson.phase);
  if (typeof lesson.title !== 'string' || lesson.title.trim() === '') errors.push('title vuoto');
  if (typeof lesson.durationMin !== 'number' || lesson.durationMin <= 0) errors.push('durationMin <= 0');
  if (!Array.isArray(lesson.sources)) errors.push('sources non array');
  else {
    if (lesson.sources.length === 0 && lesson.phase !== 'fondamenti') errors.push('sources vuoto per fase non fondamenta');
    lesson.sources.forEach((s, i) => {
      if (typeof s !== 'object' || s === null) { errors.push(`sources[${i}] non oggetto`); return; }
      if (typeof s.label !== 'string' || s.label.trim() === '') errors.push(`sources[${i}].label mancante`);
      if (typeof s.ref !== 'string' || s.ref.trim() === '') errors.push(`sources[${i}].ref mancante`);
      else if (knownSources && !knownSources.has(s.ref)) errors.push(`sources[${i}].ref="${s.ref}" NON in 99-fonti.md`);
    });
  }
  if (typeof lesson.practice !== 'object' || lesson.practice === null) errors.push('practice mancante');
  else {
    if (!PRACTICE_TYPES.has(lesson.practice.type)) errors.push(`practice.type="${lesson.practice.type}" non valido`);
    if (!Array.isArray(lesson.practice.steps)) errors.push('practice.steps non array');
    else { if (lesson.practice.steps.length === 0) errors.push('practice.steps vuoto');
      lesson.practice.steps.forEach((st, i) => { if (typeof st !== 'string' || st.trim() === '') errors.push(`steps[${i}] vuoto`); }); }
  }
  if (typeof lesson.body !== 'string' || lesson.body.trim() === '') errors.push('body vuoto');
  return errors;
}

// ---------------------------------------------------------------------------
// 4. Driver
// ---------------------------------------------------------------------------
function readLessons(dir) {
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.md')) continue;
    const full = join(dir, f);
    if (!statSync(full).isFile()) continue;
    out.push({ name: f, content: readFileSync(full, 'utf8') });
  }
  return out;
}

function main() {
  // Fonti: la copia vendorizzata nel repo rende la build self-contained
  // (CI, clone puliti). La copia sibling della wiki-os, se presente, deve
  // coincidere (check di sync esplicito, niente drift silenzioso).
  if (!existsSync(vendoredPath)) {
    console.error(`✗ Fonti vendorizzate non trovate: ${vendoredPath}`);
    process.exit(1);
  }
  const wikiMd = readFileSync(vendoredPath, 'utf8');
  if (existsSync(wikiSiblingPath)) {
    const siblingMd = readFileSync(wikiSiblingPath, 'utf8');
    if (siblingMd !== wikiMd) {
      console.error('✗ 99-fonti.md divisa tra repo e wiki-os: sincronizzare con');
      console.error('    cp ../wiki-os/99-fonti.md packages/content/wiki/99-fonti.md');
      console.error('  (o viceversa) e rilanciare. La validazione fonti usa la copia nel repo.');
      process.exit(1);
    }
  }
  const known = parseWikiSources(wikiMd);
  console.log(`ℹ Trovate ${known.size} chiavi fonte in 99-fonti.md`);

  const inputs = [];
  if (!existsSync(lessonsDir)) {
    console.error(`✗ Cartella lezioni non trovata: ${lessonsDir}`);
    process.exit(1);
  }
  inputs.push(...readLessons(lessonsDir));
  if (existsSync(extraDir)) inputs.push(...readLessons(extraDir));
  console.log(`ℹ Letti ${inputs.length} file lezione`);

  const lessons = [];
  const extras = [];
  const seen = new Set();
  for (const input of inputs) {
    const parsed = parseFrontmatter(input.content);
    const candidate = { ...parsed.data, body: parsed.body };
    const errs = validateLesson(candidate, known);
    if (errs.length) {
      console.error(`✗ "${input.name}" non valido:\n  - ${errs.join('\n  - ')}`);
      process.exit(1);
    }
    if (seen.has(candidate.day)) {
      console.error(`✗ Giorno ${candidate.day} duplicato (${input.name})`);
      process.exit(1);
    }
    seen.add(candidate.day);
    (Number.isInteger(candidate.day) ? lessons : extras).push(candidate);
  }
  for (let d = 1; d <= 21; d++) {
    if (!lessons.some((l) => l.day === d)) {
      console.error(`✗ Lezione giorno ${d} mancante`);
      process.exit(1);
    }
  }
  if (lessons.length !== 21) {
    console.error(`✗ Attese 21 lezioni, trovate ${lessons.length}`);
    process.exit(1);
  }
  lessons.sort((a, b) => a.day - b.day);
  extras.sort((a, b) => a.day - b.day);

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    lessons,
    extras,
  };
  writeFileSync(bundleOut, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`✓ Bundle scritto: ${bundleOut} (${lessons.length} lezioni, ${extras.length} extra)`);

  // report dimensione (DoD: < 150KB gz). Qui solo informativo.
  const raw = JSON.stringify(payload);
  console.log(`ℹ Dimensione raw: ${(raw.length / 1024).toFixed(1)} KB`);
}

main();
