#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.cache', '.output']);
const ignoredFiles = new Set(['package-lock.json']);

const patterns = [
  { name: 'MongoDB URI with credentials', re: /mongodb\+srv:\/\/[^\s:<>'"]+:[^\s@<>'"]+@/i },
  { name: 'Stripe secret key', re: /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'Stripe webhook secret', re: /\bwhsec_[A-Za-z0-9]{16,}\b/ },
  { name: 'Resend API key', re: /\bre_[A-Za-z0-9_\-]{20,}\b/ },
  { name: 'Cloudflare token assignment', re: /(?:CLOUDFLARE|CF)_[A-Z0-9_]*(?:TOKEN|KEY|SECRET)\s*=\s*(?!your-|replace-|<|$)[A-Za-z0-9_\-.]{20,}/i },
  { name: 'JWT secret assignment', re: /JWT_SECRET\s*=\s*(?!replace-|your-|<|$)[A-Za-z0-9_\-.]{24,}/i },
  { name: 'Cloudinary API secret assignment', re: /CLOUDINARY_API_SECRET\s*=\s*(?!your-|replace-|<|$)[A-Za-z0-9_\-.]{12,}/i },
];

const textExts = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.env', '.example', '.css', '.html'
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github' && entry.name !== '.env.example') {
      if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) out.push(...walk(full));
      continue;
    }
    if (ignoredFiles.has(entry.name)) continue;
    const ext = path.extname(entry.name);
    if (textExts.has(ext) || entry.name.includes('.env')) out.push(full);
  }
  return out;
}

const findings = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      if (pattern.re.test(line)) findings.push({ file: rel, line: i + 1, type: pattern.name });
    }
  }
}

if (findings.length) {
  console.error('Potential secrets found:');
  for (const f of findings) console.error(`- ${f.file}:${f.line} — ${f.type}`);
  console.error('\nRotate any exposed secrets, remove them from source, then rerun this scan.');
  process.exit(1);
}

console.log('No obvious committed secrets found.');
