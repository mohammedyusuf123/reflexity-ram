// ─── RAM listing template parser ──────────────────────────────────────────────
// Parses "Field: value" lines pasted from ChatGPT/another tool into the shape
// our product form expects. Lenient by design: unknown lines are ignored,
// multi-line values for Compatibility are accumulated, and slug + SKU are
// auto-derived from the name when not provided.

// Friendly field names from the template → form field names
const FIELD_MAP = {
  'name': 'name',
  'product name': 'name',
  'description': 'description',
  'line': 'line',
  'generation': 'generation',
  'form factor': 'formFactor',
  'capacity': 'capacity',
  'capacity label': 'capacityLabel',
  'kit': 'kit',
  'speed': 'speed',
  'speed label': 'speedLabel',
  'cas': 'cas',
  'cas latency': 'cas',
  'timings': 'timings',
  'voltage': 'voltage',
  'condition': 'condition',
  'warranty': 'warranty',
  'tags': 'tags',
  'compatibility': 'compatibility',
  'price': 'price',
  'stock': 'stockQuantity',
  'quantity': 'stockQuantity',
  'stock quantity': 'stockQuantity',
  'sku': 'sku',
  'part number': 'sku',
};

const MULTILINE_FIELDS = new Set(['description', 'compatibility']);
const NUMERIC_FIELDS = new Set(['capacity', 'speed', 'price', 'stockQuantity']);

const slugify = (s, prefix) => {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return base ? `${prefix}${base}` : '';
};

const skuFromName = (name) => {
  const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  return base ? `RFX-${base}` : '';
};

const skuFromPartNumber = (pn) =>
  pn.toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export function parseRamTemplate(text) {
  const lines = (text || '').split(/\r?\n/);
  const data = {};
  const buffers = {}; // multi-line accumulators
  let active = null; // currently-accumulating multi-line field, if any

  const KEY_RE = /^([A-Za-z][A-Za-z ]*?):\s*(.*)$/;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) { active = null; continue; }

    const m = line.match(KEY_RE);
    if (m) {
      const key = m[1].trim().toLowerCase();
      const value = m[2].trim();
      const field = FIELD_MAP[key];

      if (field) {
        if (MULTILINE_FIELDS.has(field)) {
          active = field;
          buffers[field] = value ? [value] : [];
        } else {
          active = null;
          data[field] = value;
        }
        continue;
      }
      // unrecognized "X:" header — fall through and treat as content if we're inside a multi-line block
    }

    if (active) {
      (buffers[active] = buffers[active] || []).push(line.trim());
    }
  }

  // Finalize multi-line fields
  if (buffers.description) {
    data.description = buffers.description.join(' ').replace(/\s+/g, ' ').trim();
  }
  if (buffers.compatibility) {
    data.compatibility = buffers.compatibility.join('\n');
  }

  // Coerce numerics
  for (const f of NUMERIC_FIELDS) {
    if (data[f] !== undefined && data[f] !== '') {
      const n = Number(String(data[f]).replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(n)) data[f] = n;
    }
  }

  // Auto-derive slug + SKU from the name when not provided
  if (data.name) {
    if (!data.slug) data.slug = slugify(data.name, 'rfx-');
    if (!data.sku) data.sku = skuFromName(data.name);
  }
  if (data.sku && data.sku !== skuFromName(data.name || '')) {
    // If a part number was supplied as SKU, normalize it
    data.sku = skuFromPartNumber(data.sku);
  }

  return data;
}

// Three categories the store sells. The picker uses these to:
//  - prefill `line` and a sensible default `formFactor`
//  - restrict the Form Factor dropdown to category-appropriate options
//  - hint at the right template to paste
export const RAM_CATEGORIES = {
  desktop: {
    id: 'desktop',
    label: 'Desktop RAM',
    blurb: 'Full-size UDIMM modules for desktop motherboards',
    line: 'Desktop',
    formFactors: ['UDIMM'],
    defaultFormFactor: 'UDIMM',
  },
  laptop: {
    id: 'laptop',
    label: 'Laptop RAM',
    blurb: 'SO-DIMM modules for laptops and mini-PCs',
    line: 'Laptop / Mini-PC',
    formFactors: ['SO-DIMM'],
    defaultFormFactor: 'SO-DIMM',
  },
  server: {
    id: 'server',
    label: 'Server RAM',
    blurb: 'Registered or load-reduced ECC modules for servers and workstations',
    line: 'Server',
    formFactors: ['RDIMM', 'LRDIMM', 'UDIMM', 'SO-DIMM'],
    defaultFormFactor: 'RDIMM',
  },
};

// Used to pre-select a category when editing — keeps Form Factor options sane.
export function inferCategoryFromProduct(p) {
  if (!p) return null;
  if (p.line === 'Server') return 'server';
  if (p.line === 'Laptop / Mini-PC' || p.line === 'Laptop') return 'laptop';
  if (p.line === 'Desktop' || p.line === 'Gaming / Enthusiast' || p.line === 'Mainstream') return 'desktop';
  // Fallback by form factor
  if (p.formFactor === 'SO-DIMM') return 'laptop';
  if (p.formFactor === 'RDIMM' || p.formFactor === 'LRDIMM') return 'server';
  return 'desktop';
}
