import type { CSSProperties } from 'react';

const cache = new Map<string, CSSProperties>();

/** Turns an inline CSS string ("display:flex; gap:8px") into a React style object. */
export function css(s: string): CSSProperties {
  const hit = cache.get(s);
  if (hit) return hit;
  const o: Record<string, string> = {};
  for (const d of s.split(';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const k = d.slice(0, i).trim();
    const v = d.slice(i + 1).trim();
    if (!k || !v) continue;
    o[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  }
  if (cache.size < 2000) cache.set(s, o as CSSProperties);
  return o as CSSProperties;
}
