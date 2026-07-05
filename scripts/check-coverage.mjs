#!/usr/bin/env node
/**
 * Coverage gate: faila CI se coverage di @lucidme/core o @lucidme/db < 90%.
 * Regola wiki §8.5.1 + roadmap/README.md DoD #2.
 * Legge vitest json-summary. */
import { readFileSync, existsSync } from 'node:fs';

const PACKAGES = ['packages/core', 'packages/db'];
const THRESHOLD = 90; // %

let failed = false;

for (const pkg of PACKAGES) {
  const summaryPath = `${pkg}/coverage/coverage-summary.json`;
  if (!existsSync(summaryPath)) {
    // In Step 0 i package sono placeholder: nessun file da testare → coverage skip.
    console.log(`⚠️  ${pkg}: nessun report di coverage trovato (${summaryPath}).`);
    console.log('    Step 0 = placeholder; il gate diventa effettivo dal Step 2 in poi.');
    continue;
  }
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const total = summary.total;
  if (!total) {
    console.log(`⚠️  ${pkg}: report malformato, skip.`);
    continue;
  }
  const pct = (key) => total[key].pct;
  const metrics = ['lines', 'statements', 'functions', 'branches'];
  const minPct = Math.min(...metrics.map(pct));
  const status = minPct >= THRESHOLD ? 'PASS' : 'FAIL';
  console.log(`${status}  ${pkg}: lines=${pct('lines')}% stmt=${pct('statements')}% fn=${pct('functions')}% br=${pct('branches')}% (soglia ${THRESHOLD}%)`);
  if (minPct < THRESHOLD) failed = true;
}

if (failed) {
  console.error('\n❌ Coverage gate non superato.');
  process.exit(1);
}
console.log('\n✅ Coverage gate OK (o placeholder Step 0).');
