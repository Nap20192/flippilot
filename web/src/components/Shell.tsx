import React from 'react';
import { css } from '../css';
import { useStore } from '../store';

const I = (props: { d: React.ReactNode }) => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">{props.d}</svg>
);

export const ICONS = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  bolt: <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />,
  calc: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8" /><path d="M16 14v4" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>,
  set: <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
};

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs><linearGradient id="shell-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b9bff" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient></defs>
      <path d="M24 4.5 41 14.25v19.5L24 43.5 7 33.75v-19.5z" fill="url(#shell-g)" stroke="url(#shell-g)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M26.5 10 15.5 26.2h7.6L20.8 38 32.5 21.4h-7.8z" fill="#fff" />
    </svg>
  );
}

const SHORT: Record<string, string> = {"Dashboard": "Home", "Analyze vehicle": "Analyze", "Deal finder": "Deals", "Watchlist": "Saved", "Market intelligence": "Market", "Settings": "Settings"};

const NAV = [
  ['/app', 'Dashboard', ICONS.dash], ['/app/analyze', 'Analyze vehicle', ICONS.calc], ['/app/deals', 'Deal finder', ICONS.search],
  ['/app/watchlist', 'Watchlist', ICONS.star], ['/app/market', 'Market intelligence', ICONS.globe], ['/app/settings', 'Settings', ICONS.set],
] as const;

/** Sidebar + top bar of the v1 app pages (Analyze, Deal finder). */
export function AppFrame({ active, crumb, children }: { active: string; crumb: string; children: React.ReactNode }) {
  const { watch, settings, updateSettings, user, logout } = useStore();
  return (
    <div className="shell" style={css('min-height: 100vh; display: flex; flex-wrap: wrap; align-items: stretch;')}>
      <header className="m-top">
        <a href="/" className="m-brand" aria-label="FlipPilot home"><Logo size={26} />FlipPilot</a>
        {user ? <button type="button" className="m-act" onClick={() => void logout()}>Sign out</button> : <a href="/login" className="m-act">Sign in</a>}
      </header>
      <aside style={css('flex: 1 1 240px; max-width: 100%; box-sizing: border-box; background: var(--side); border-right: 1px solid var(--border); padding: 16px 12px; display: flex; flex-direction: column; gap: 4px;')}>
        <a href="/" aria-label="FlipPilot home" style={css('display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; letter-spacing: -0.02em; padding: 4px 8px 16px;')}>
          <Logo />FlipPilot
        </a>
        <span style={css('font-size: 12px; font-weight: 500; color: var(--mfg); padding: 8px 10px 4px;')}>Workspace</span>
        {NAV.map(([href, label, icon]) => (
          <a key={href} className={'nav' + (href === active ? ' on' : '')} href={href} aria-current={href === active ? 'page' : undefined}>
            <I d={icon} /><span className="nl-full">{label}</span><span className="nl-short">{SHORT[label]}</span>
            {href === '/app/watchlist' && <span className="badge num" style={css('margin-left: auto; height: 20px; padding: 0 7px;')}>{watch.length}</span>}
          </a>
        ))}
        <div style={css('margin-top: auto; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--card); font-size: 13px; display: flex; flex-direction: column; gap: 8px;')}>
          {user ? (
            <>
              <span style={css('color: var(--mfg); overflow-wrap: anywhere;')}>{user.email}</span>
              <button type="button" className="btn btn-outline" onClick={() => void logout()} style={css('justify-content: center;')}>Sign out</button>
            </>
          ) : (
            <>
              <b style={css('font-weight: 600;')}>Browsing as guest</b>
              <span style={css('color: var(--mfg);')}>Your data stays in this browser. Sign in to sync it and use your own settings.</span>
              <a className="btn btn-outline" href="/login" style={css('justify-content: center;')}>Sign in</a>
            </>
          )}
        </div>
      </aside>
      <main style={css('flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column;')}>
        <div style={css('height: 56px; border-bottom: 1px solid var(--border); padding: 0 32px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;')}>
          <div style={css('font-size: 13px; color: var(--mfg); display: flex; gap: 8px; align-items: center;')}>
            <span>Workspace</span><span aria-hidden="true">/</span><span style={css('color: var(--fg); font-weight: 500;')}>{crumb}</span>
          </div>
          <div style={css('display: flex; gap: 8px; align-items: center;')}>
            <span className="badge">Fixed demo FX rates</span>
            <select aria-label="Display currency" style={css('width: 96px; height: 32px;')} value={settings.cur} onChange={(e) => updateSettings({ ...settings, cur: e.target.value as typeof settings.cur })}>
              <option value="EUR">EUR €</option><option value="CZK">CZK Kč</option><option value="PLN">PLN zł</option>
            </select>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
