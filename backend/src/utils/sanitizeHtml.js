// ─── Minimal HTML sanitizer for admin-edited page content ──────────────────────
// These pages (shipping/returns/warranty/faq) only need basic formatting, so
// rather than pull in a heavy dependency we allowlist a small set of safe tags
// and strip everything else. Admin-only input, but we sanitize anyway — defense
// in depth, and it neutralizes any pasted markup from a Word doc / web page.

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li',
  'h2', 'h3', 'h4',
  'a', 'blockquote',
]);

// Per-tag allowed attributes
const ALLOWED_ATTRS = {
  a: new Set(['href', 'title']),
};

const stripTag = (tag) => `</${tag}>`;

function sanitizeHtml(input) {
  if (!input || typeof input !== 'string') return '';

  // 1. Remove script/style blocks entirely (content included)
  let html = input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 2. Walk tags, keeping only allowlisted ones with safe attributes
  html = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';

    // Closing tag — keep as-is
    if (match.startsWith('</')) return stripTag(tag);

    // Opening tag — filter attributes
    const allowed = ALLOWED_ATTRS[tag];
    if (!allowed) return `<${tag}>`;

    const keptAttrs = [];
    const attrRe = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = attrRe.exec(rawAttrs)) !== null) {
      const name = m[1].toLowerCase();
      let value = m[2];
      if (!allowed.has(name)) continue;
      // Block dangerous URL schemes on href
      if (name === 'href') {
        const v = value.trim().toLowerCase();
        if (v.startsWith('javascript:') || v.startsWith('data:') || v.startsWith('vbscript:')) continue;
      }
      // Escape quotes defensively
      value = value.replace(/"/g, '&quot;');
      keptAttrs.push(`${name}="${value}"`);
    }
    // Force external links to be safe
    if (tag === 'a') keptAttrs.push('rel="noopener noreferrer nofollow"');

    return `<${tag}${keptAttrs.length ? ' ' + keptAttrs.join(' ') : ''}>`;
  });

  // 3. Strip any leftover on* event handler fragments (paranoia)
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');

  return html.trim();
}

module.exports = { sanitizeHtml };
