import type { Level, Settings } from './api';

const SYMBOL = { EUR: '€', CZK: 'Kč', PLN: 'zł' } as const;

/** Money is stored in EUR; convert with the user's fixed demo rates for display. */
export function makeMoney(s: Settings) {
  const rate = s.cur === 'CZK' ? s.fxCZK : s.cur === 'PLN' ? s.fxPLN : 1;
  return (eur: number) => {
    const v = Math.round(eur * rate);
    const n = Math.abs(v).toLocaleString('en-US');
    const sign = v < 0 ? '−' : '';
    return s.cur === 'EUR' ? `${sign}€${n}` : `${sign}${n} ${SYMBOL[s.cur]}`;
  };
}
export const rateOf = (s: Settings) => (s.cur === 'CZK' ? s.fxCZK : s.cur === 'PLN' ? s.fxPLN : 1);
export const pct = (x: number, d = 1) => `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(d)}%`;
export const levelKey = (l: Level) => (l === 'g' ? 'pos' : l === 'r' ? 'neg' : l === 'a' ? 'warn' : 'blue') as 'pos' | 'neg' | 'warn' | 'blue';

export const curSymbol = (s: Settings) => SYMBOL[s.cur];
/** Compact number in the display currency (no symbol): 710, 2.5k, −1.4k. */
export function makeCompact(s: Settings) {
  const rate = rateOf(s);
  return (eur: number) => {
    const v = eur * rate;
    const a = Math.abs(v);
    const t = a >= 10000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(a));
    return (v < 0 ? '−' : '') + t;
  };
}
/** Number text for a money input: EUR amount shown in the display currency. */
export const toDisplay = (eur: number, rate: number) => String(Math.round(eur * rate * 100) / 100);
