#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
  { name: 'JWT refresh secret assignment', re: /JWT_REFRESH_SECRET\s*=\s*(?!replace-|your-|<|$)[A-Za-z0-9_\-.]{24,}/i },
  { name: 'Session secret assignment', re: /SESSION_SECRET\s*=\s*(?!replace-|your-|<|$)[A-Za-z0-9_\-.]{24,}/i },
  { name: 'Google client secret assignment', re: /GOOGLE_CLIENT_SECRET\s*=\s*(?!replace-|your-|<|$)[A-Za-z0-9_\-.]{20,}/i },
  { name: 'Cloudinary API secret assignment', re: /CLOUDINARY_API_SECRET\s*=\s*(?!your-|replace-|<|$)[A-Za-z0-9_\-.]{12,}/i },
];

let trackedFiles = [];
try {
  trackedFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
} catch {
  // The content scan still works when the script is run outside a Git checkout.
}

const trackedEnvFiles = trackedFiles.filter((file) => {
  const base = path.basename(file);
  return base === '.env' || (base.startsWith('.env.') && base !== '.env.example');
});

const textExts = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.env', '.example', '.css', '.html'
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Local runtime env files are intentionally untracked and may contain the
    // credentials this scanner is designed to keep out of committed source.
    if (entry.isFile() && entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
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
for (const file of trackedEnvFiles) {
  findings.push({ file, line: 1, type: 'Tracked runtime environment file' });
}
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
