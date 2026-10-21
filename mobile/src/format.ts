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
