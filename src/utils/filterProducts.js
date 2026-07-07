// ── Client-side facet filtering ──────────────────────────────────
// Moved out of data/products.js so CollectionPage.jsx has no runtime
// dependency on the local mock catalogue — this is a pure function
// that operates on whatever product array it's given (Supabase or
// local), unchanged from its original implementation.

export const filterProducts = (items, filters, priceRange) => {
  return items.filter(p => {
    // Price range
    if (priceRange && (p.price < priceRange[0] || p.price > priceRange[1])) return false;

    // Each filter group must be satisfied
    for (const [group, values] of Object.entries(filters)) {
      if (!values || values.length === 0) continue;
      const matched = values.some(v => {
        const vl = v.toLowerCase();
        switch (group) {
          case 'Series':       return p.series?.toLowerCase() === vl;
          case 'Brand':        return p.brand?.toLowerCase() === vl;
          case 'Skill Level':
          case 'Player Level': return p.playerLevel?.toLowerCase().includes(vl);
          case 'Playing Style':return p.playingStyle?.toLowerCase().includes(vl);
          case 'Balance':      return p.balance?.toLowerCase().includes(vl.replace('head-heavy','head').replace('head-light','head').split('-').join(''));
          case 'Flex':         return p.flex?.toLowerCase().includes(vl);
          case 'Weight':       return p.weight?.toLowerCase().includes(vl);
          // Non-racket filters
          case 'Court Type':   return p.specs?.courtType?.toLowerCase().includes(vl);
          case 'Cushioning':   return p.specs?.cushioning?.toLowerCase().includes(vl);
          case 'Support':      return p.specs?.support?.toLowerCase().includes(vl);
          case 'Style':        return p.tags?.some(t => t.includes(vl));
          case 'Capacity':     return p.tags?.some(t => t.includes(vl));
          case 'Type':         return p.tags?.some(t => t.includes(vl));
          case 'Grade':        return p.specs?.grade?.toLowerCase().includes(vl);
          case 'Gauge':        return p.specs?.gauge?.toLowerCase().includes(vl);
          case 'Feel':         return p.tags?.some(t => t.includes(vl));
          case 'Thickness':    return p.specs?.thickness?.toLowerCase().includes(vl);
          case 'Size':         return p.sizes?.includes(v);
          default:             return p.tags?.some(t => t.includes(vl));
        }
      });
      if (!matched) return false;
    }
    return true;
  });
};
