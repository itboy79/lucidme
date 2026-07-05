#!/usr/bin/env node
/**
 * Riscorre il monorepo e rigenera icone placeholder PWA se mancanti.
 * In Step 0 i placeholder sono committati; questo script è un salvagente per CI/dev.
 * Le icone definitive arrivano in Step 8 (D-008 naming). */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(here, '..', 'apps', 'app', 'static', 'icons');
const required = ['icon-192.png', 'icon-512.png', 'maskable-512.png'];

const missing = required.filter((f) => !existsSync(join(iconsDir, f)));
if (missing.length === 0) {
  console.log('✅ Tutte le icone PWA presenti.');
  process.exit(0);
}

console.log(`⚠️  Icone mancanti: ${missing.join(', ')}. Rigenero con gen-icons.py (richiede python3).`);
const res = spawnSync('python3', ['gen-icons.py'], { cwd: iconsDir, stdio: 'inherit' });
if (res.status !== 0) {
  console.error('❌ Rigenerazione icone fallita. Installa python3 o genera manualmente.');
  process.exit(1);
}
console.log('✅ Icone rigenerate.');
