import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './responsive.css';
import { StoreProvider } from './store';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Analytics from './pages/Analytics';
import Analyze from './pages/AnalyzePage';
import Deals from './pages/DealsPage';
import Watchlist from './pages/Watchlist';
import Market from './pages/Market';
import Settings from './pages/Settings';

/** The ported pages use plain <a href="/…"> links: route them client-side. */
function Links() {
  const nav = useNavigate();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      const href = a?.getAttribute('href');
      if (!a || !href || a.target || href.startsWith('//') || !(href.startsWith('/') || href.startsWith('#'))) return;
      e.preventDefault();
      nav(href.startsWith('#') ? pathname + href : href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [nav, pathname]);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <Links />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Analytics />} />
          <Route path="/app/analyze" element={<Analyze />} />
          <Route path="/app/deals" element={<Deals />} />
          <Route path="/app/watchlist" element={<Watchlist />} />
          <Route path="/app/market" element={<Market />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
