import React, { createContext, useContext, useMemo, useState } from 'react';

// shadcn/ui neutral tokens (oklch converted to hex) with the logo blue as the one accent.
const light = {
  bg: '#fafafa', card: '#ffffff', fg: '#0a0a0a', muted: '#f5f5f5', mfg: '#737373', border: '#e5e5e5',
  primary: '#171717', pfg: '#fafafa', blue: '#2563eb', blueBg: '#eff6ff',
  pos: '#047857', posBg: '#ecfdf5', neg: '#dc2626', negBg: '#fef2f2', warn: '#b45309', warnBg: '#fffbeb',
  chart: ['#171717', '#2563eb', '#6366f1', '#f59e0b', '#94a3b8', '#cbd5e1'],
};
const dark: typeof light = {
  bg: '#0a0a0a', card: '#171717', fg: '#fafafa', muted: '#262626', mfg: '#a3a3a3', border: '#262626',
  primary: '#e5e5e5', pfg: '#171717', blue: '#60a5fa', blueBg: '#1e293b',
  pos: '#34d399', posBg: '#10251d', neg: '#f87171', negBg: '#2a1517', warn: '#fbbf24', warnBg: '#2a2210',
  chart: ['#e5e5e5', '#60a5fa', '#818cf8', '#fbbf24', '#94a3b8', '#475569'],
};

export type Theme = typeof light & { mode: 'light' | 'dark' };
type Ctx = { theme: Theme; setMode: (m: 'light' | 'dark') => void };
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const value = useMemo(() => ({ theme: { ...(mode === 'light' ? light : dark), mode }, setMode }), [mode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx)!;

export const font = {
  regular: 'Geist_400Regular', medium: 'Geist_500Medium', semibold: 'Geist_600SemiBold', bold: 'Geist_700Bold',
  mono: 'GeistMono_500Medium',
};
export const radius = { sm: 6, md: 8, lg: 12, xl: 14 };
