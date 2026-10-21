import React from 'react';
import { css } from '../css';
import { useStore } from '../store';
import { ICONS, Logo } from './Shell';

const SHORT: Record<string, string> = {"Dashboard": "Home", "Analyze vehicle": "Analyze", "Deal finder": "Deals", "Watchlist": "Saved", "Market intelligence": "Market", "Settings": "Settings"};

const NAV = [
  ['/app', 'Dashboard', ICONS.dash], ['/app/analyze', 'Analyze vehicle', ICONS.bolt], ['/app/deals', 'Deal finder', ICONS.search],
  ['/app/watchlist', 'Watchlist', ICONS.star], ['/app/market', 'Market intelligence', ICONS.globe], ['/app/settings', 'Settings', ICONS.set],
] as const;

/** Sidebar of the light v2 pages (dashboard, watchlist, market, settings). */
export function V2Sidebar({ active }: { active: string }) {
  const { user, logout, watch } = useStore();
  return (
    <>
    <header className="m-top">
      <a href="/" className="m-brand" aria-label="FlipPilot home"><Logo size={26} />FlipPilot</a>
      {user ? <button type="button" className="m-act" onClick={() => void logout()}>Sign out</button> : <a href="/login" className="m-act">Sign in</a>}
    </header>
    <aside style={css('flex: 1 1 236px; max-width: 100%; box-sizing: border-box; background: var(--card, var(--panel)); border-right: 1px solid var(--border); padding: 18px 12px; display: flex; flex-direction: column; gap: 4px;')}>
      <a href="/" aria-label="FlipPilot home" style={css('display: flex; align-items: center; gap: 10px; padding: 2px 8px 18px;')}>
        <Logo size={30} /><span style={css('font-weight: 700; font-size: 18px; letter-spacing: -0.03em;')}>FlipPilot</span>
      </a>
      {NAV.map(([href, label, icon]) => (
        <a key={href} className={'nav' + (href === active ? ' on' : '')} href={href} aria-current={href === active ? 'page' : undefined}>
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">{icon}</svg><span className="nl-full">{label}</span><span className="nl-short">{SHORT[label]}</span>
          {href === '/app/watchlist' && watch.length > 0 && <span className="pill num" style={css('margin-left: auto; height: 20px; padding: 0 7px;')}>{watch.length}</span>}
        </a>
      ))}
      <div style={css('margin-top: auto; padding: 12px; border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; gap: 8px; font-size: 13px;')}>
        {user ? (
          <>
            <span style={css('color: var(--mfg); overflow-wrap: anywhere;')}>{user.email}</span>
            <button type="button" className="btn" onClick={() => void logout()} style={css('justify-content: center;')}>Sign out</button>
          </>
        ) : (
          <>
            <b style={css('font-weight: 600;')}>Browsing as guest</b>
            <span style={css('color: var(--mfg);')}>Your data stays in this browser. Sign in to sync it and use your own settings.</span>
            <a className="btn" href="/login" style={css('justify-content: center;')}>Sign in</a>
          </>
        )}
      </div>
    </aside>
    </>
  );
}
