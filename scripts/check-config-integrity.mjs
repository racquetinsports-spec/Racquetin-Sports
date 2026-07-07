#!/usr/bin/env node
// ── Config integrity check ──────────────────────────────────────────
// Nothing in this project's own source writes to package.json,
// vite.config.js, or .env — verified by searching the whole repo for
// writeFile/writeFileSync/outputFile/`cat >` targeting those files
// (the only writeFileSync call in the project is scripts/gen-seed.mjs,
// and it only ever writes supabase/seed_products.sql).
//
// If you're seeing package.json / vite.config.js / .env go empty or
// invalid while `npm run dev` is running, something OUTSIDE this
// project is overwriting them — Vite just happens to be the thing
// that notices and reports it, because its file watcher picks up the
// change and tries to reload. Common real causes, roughly in order
// of likelihood:
//
//   1. Disk full. A process that opens a file for writing (truncating
//      it to 0 bytes first) and then fails to write the new content
//      because the disk is full leaves you with an empty file. Check
//      free disk space.
//   2. Another coding tool/agent running against the same folder at
//      the same time (a second AI coding session, an editor's
//      auto-format/auto-fix-on-save, a scaffolding CLI, etc.) — if
//      anything else has this folder open and is "helpfully"
//      regenerating config, it can race with Vite's own file watcher.
//   3. A cloud-sync client (Dropbox / OneDrive / Google Drive / iCloud
//      Drive) syncing this folder — sync conflicts can briefly clobber
//      files with an empty or stale copy mid-write.
//   4. Antivirus / endpoint security scanning and quarantining files
//      it doesn't recognize immediately after they're written.
//
// Run this manually (`node scripts/check-config-integrity.mjs`) any
// time you suspect this is happening again — it won't fix the root
// cause (that's environmental, not something app code can prevent),
// but it tells you immediately and specifically what's wrong instead
// of chasing a cryptic Vite restart loop.

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

function check(name, validate) {
  const path = join(root, name);
  if (!existsSync(path)) {
    console.log(`⚠️  ${name}: not found (skipping)`);
    return;
  }
  const content = readFileSync(path, 'utf8');
  if (content.trim().length === 0) {
    console.error(`❌ ${name} is EMPTY (0 bytes of content). This is the truncation bug — restore it before running npm run dev.`);
    failed = true;
    return;
  }
  try {
    validate(content);
    console.log(`✅ ${name}: OK (${content.length} bytes)`);
  } catch (err) {
    console.error(`❌ ${name} exists but is invalid: ${err.message}`);
    failed = true;
  }
}

check('package.json', (content) => {
  const pkg = JSON.parse(content); // throws if not valid JSON
  if (!pkg.name || !pkg.scripts) throw new Error('missing expected "name" or "scripts" field');
});

check('vite.config.js', (content) => {
  if (!content.includes('export default')) throw new Error('no "export default" found — config must export or return an object');
});

check('.env', (content) => {
  if (!content.includes('VITE_SUPABASE_URL') || !content.includes('VITE_SUPABASE_ANON_KEY')) {
    throw new Error('missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
});

if (failed) {
  console.error('\nOne or more critical files are corrupted. See the comment at the top of this script for likely external causes.');
  process.exit(1);
} else {
  console.log('\nAll critical config files look intact.');
}
