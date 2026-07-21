// ── Racket Finder recommendation engine ────────────────────────────
// Scores every racket in the catalogue against the shopper's answers
// and returns the top matches. Pure function, no fake/hardcoded
// results — every score is derived from real product fields
// (playerLevel, playingStyle, balance, flex, price) already present
// in src/data/products.js (or the Supabase-backed product API, if
// that's what the caller passes in).

import { compareBrands } from './brandOrder';

const LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];

export const BUDGET_RANGES = [
  { key: 'under-8k',  label: 'Under ₹8,000',     min: 0,     max: 8000 },
  { key: '8k-15k',    label: '₹8,000 – ₹15,000',  min: 8000,  max: 15000 },
  { key: '15k-22k',   label: '₹15,000 – ₹22,000', min: 15000, max: 22000 },
  { key: '22k-plus',  label: '₹22,000+',          min: 22000, max: Infinity },
];

function levelScore(userLevel, productLevel) {
  if (!productLevel) return 0;
  const a = LEVEL_ORDER.indexOf(userLevel);
  const b = LEVEL_ORDER.indexOf(productLevel);
  if (a === -1 || b === -1) return 0;
  const dist = Math.abs(a - b);
  return dist === 0 ? 25 : dist === 1 ? 14 : dist === 2 ? 5 : 0;
}

function styleScore(userStyle, product) {
  const style = product.playingStyle;
  const balance = product.balance;
  const flex = product.flex || '';
  switch (userStyle) {
    case 'Attacking':
      return style === 'Attacking' ? 25 : style === 'All-Round' ? 10 : 0;
    case 'Defensive':
      return style === 'Defensive' ? 25 : style === 'All-Round' ? 10 : 0;
    case 'All-round':
      return style === 'All-Round' ? 25 : 10;
    case 'Fast doubles': {
      let s = style === 'All-Round' ? 10 : style === 'Attacking' ? 6 : 0;
      if (balance === 'Head-Light' || balance === 'Even Balance') s += 10;
      if (/Flexible|Medium/.test(flex)) s += 5;
      return s;
    }
    case 'Control': {
      let s = style === 'All-Round' ? 12 : style === 'Defensive' ? 8 : 0;
      if (balance === 'Even Balance') s += 10;
      if (/Medium/.test(flex)) s += 3;
      return s;
    }
    default:
      return 0;
  }
}

function balanceScore(userFeel, productBalance) {
  if (!productBalance) return 0;
  if (userFeel === productBalance) return 20;
  if (userFeel === 'Even Balance' || productBalance === 'Even Balance') return 8;
  return 0;
}

function flexScore(userFlex, productFlex) {
  if (!productFlex) return 0;
  if (userFlex === productFlex) return 15;
  if (productFlex === 'Medium-Stiff' && (userFlex === 'Medium' || userFlex === 'Stiff')) return 9;
  if (userFlex === 'Medium-Stiff' && (productFlex === 'Medium' || productFlex === 'Stiff')) return 9;
  if ((userFlex === 'Stiff' && productFlex === 'Extra Stiff') || (userFlex === 'Extra Stiff' && productFlex === 'Stiff')) return 6;
  return 0;
}

function budgetScore(userBudgetKey, price) {
  const range = BUDGET_RANGES.find(r => r.key === userBudgetKey);
  if (!range || price == null) return 5;
  if (price >= range.min && price <= range.max) return 10;
  const bound = price < range.min ? range.min : range.max;
  if (bound === Infinity) return 10;
  const distPct = Math.abs(price - bound) / bound;
  return distPct <= 0.2 ? 5 : 0;
}

function focusScore(userFocus, product) {
  const balance = product.balance;
  const flex = product.flex || '';
  const style = product.playingStyle;
  if (userFocus === 'Singles') {
    let s = 0;
    if (balance === 'Head-Heavy' || balance === 'Even Balance') s += 3;
    if (/Stiff/.test(flex)) s += 2;
    if (style === 'Attacking') s += 2;
    return Math.min(s, 5);
  }
  if (userFocus === 'Doubles') {
    let s = 0;
    if (balance === 'Head-Light' || balance === 'Even Balance') s += 3;
    if (/Flexible|Medium/.test(flex)) s += 2;
    if (style === 'All-Round' || style === 'Attacking') s += 1;
    return Math.min(s, 5);
  }
  return 2; // "Both" — small neutral credit, no bias either way
}

function buildReason(answers, product) {
  const focusWord = !answers.focus || answers.focus === 'Both' ? 'players' : `${answers.focus.toLowerCase()} players`;
  const styleWord = answers.style.toLowerCase();
  const lead = product.playingStyle && product.playingStyle.toLowerCase() === styleWord
    ? `Purpose-built for ${styleWord} ${focusWord}`
    : `A well-rounded pick for ${focusWord} with a ${styleWord} style`;

  const feel = product.balance === 'Head-Heavy'
    ? 'its head-heavy balance adds real weight behind smashes'
    : product.balance === 'Head-Light'
      ? 'its head-light balance means faster swings and quicker recovery at the net'
      : 'its even balance keeps attack and defence equally accessible';

  const flexLine = product.flex
    ? (/Stiff/.test(product.flex)
        ? `a ${product.flex.toLowerCase()} shaft gives crisp, powerful contact for players who generate their own pace`
        : `a ${product.flex.toLowerCase()} shaft adds extra whip for touch and repulsion on slower swings`)
    : null;

  return flexLine ? `${lead} — ${feel}, and ${flexLine}.` : `${lead} — ${feel}.`;
}

/**
 * @param {Object} answers  { level, style, feel, flex, budget, focus }
 * @param {Array}  rackets  candidate racket products (already filtered to category: 'rackets')
 * @param {number} limit
 * @returns {Array<{ product, score, reason }>}
 */
export function recommendRackets(answers, rackets, limit = 3) {
  if (!Array.isArray(rackets) || rackets.length === 0) return [];

  const scored = rackets.map(product => {
    const total =
      levelScore(answers.level, product.playerLevel) +
      styleScore(answers.style, product) +
      balanceScore(answers.feel, product.balance) +
      flexScore(answers.flex, product.flex) +
      budgetScore(answers.budget, product.price) +
      focusScore(answers.focus, product);
    return { product, score: total };
  });

  // Fit score decides the ranking; brand priority only breaks exact
  // ties (so equally-good matches settle in a deterministic,
  // Yonex → Li-Ning → Hundred → other order instead of whatever order
  // the candidate list happened to arrive in). It never outranks a
  // genuinely better-fitting racket from a lower-priority brand.
  scored.sort((a, b) => b.score - a.score || compareBrands(a.product.brand, b.product.brand));

  return scored.slice(0, limit).map(({ product, score }) => ({
    product,
    score,
    reason: buildReason(answers, product),
  }));
}
