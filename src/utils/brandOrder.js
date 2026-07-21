// ── Centralized racket brand ordering ───────────────────────────────
// Single source of truth for how racket brands are ordered wherever
// they're displayed: collection page brand tabs, the filter drawer,
// nav dropdowns, search suggestions/results, related & recommended
// products, Racket Finder results, and any admin brand list.
//
// Nothing outside this file should hardcode a brand sort order or
// re-implement this priority — import compareBrands()/sortBrands()
// instead, so the ordering rule only ever needs to change in one
// place.
//
// Priority: Yonex, then Li-Ning, then Hundred. Any other brand keeps
// alphabetical order after those three. To add a new priority brand
// or change the order, edit PRIORITY_BRANDS below — nowhere else.
const PRIORITY_BRANDS = ['Yonex', 'Li-Ning', 'Hundred'];

// Collapses spacing/hyphenation/case variants ("Li Ning", "LI-NING",
// "li-ning", "Li–Ning") down to one comparable key, so every spelling
// of the same brand resolves to the same priority bucket and dedupes
// together instead of showing up as separate entries.
function normalizeBrandKey(brand) {
  return String(brand || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-–—]+/g, '');
}

const PRIORITY_INDEX = new Map(
  PRIORITY_BRANDS.map((b, i) => [normalizeBrandKey(b), i])
);

// Canonical display spelling for a brand, if it matches a priority
// brand under any naming variation (e.g. "LI-NING" / "Li Ning" →
// "Li-Ning"). Anything not in the priority list is returned exactly
// as given — this never renames or drops a brand that exists in the
// database, it only normalizes the three priority brands' display.
export function canonicalBrandName(brand) {
  const idx = PRIORITY_INDEX.get(normalizeBrandKey(brand));
  return idx !== undefined ? PRIORITY_BRANDS[idx] : brand;
}

// Lower = higher priority. Non-priority brands all share one bucket
// (PRIORITY_BRANDS.length) so they fall back to alphabetical among
// themselves via compareBrands.
export function brandPriorityIndex(brand) {
  const idx = PRIORITY_INDEX.get(normalizeBrandKey(brand));
  return idx === undefined ? PRIORITY_BRANDS.length : idx;
}

// Comparator for Array.prototype.sort — Yonex, Li-Ning, Hundred (in
// that order) first, then every other brand alphabetically. Never
// falls back to pure alphabetical for the priority brands themselves.
export function compareBrands(a, b) {
  const pa = brandPriorityIndex(a);
  const pb = brandPriorityIndex(b);
  if (pa !== pb) return pa - pb;
  return String(a || '').localeCompare(String(b || ''));
}

// Sorts a list of raw brand strings (e.g. distinct values pulled from
// product rows) into priority order, normalizing naming variants and
// deduping them onto one canonical display spelling. Falsy entries
// are dropped; nothing else is ever removed — every real brand in the
// input is represented once in the output.
export function sortBrands(brands) {
  const seen = new Map(); // normalized key → canonical display name
  (brands || []).forEach(b => {
    if (!b) return;
    const key = normalizeBrandKey(b);
    if (!seen.has(key)) seen.set(key, canonicalBrandName(b));
  });
  return [...seen.values()].sort(compareBrands);
}
