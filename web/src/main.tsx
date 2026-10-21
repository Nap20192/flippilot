import './index.css';
import './responsive.css';
import './animations.css';
import React, { Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StoreProvider, useStore } from './store';
import Landing from './pages/Landing';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const DealsPage = lazy(() => import('./pages/DealsPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

/** The landing page uses plain <a href="/…"> links: route them client-side. */
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

/** Fades landing sections in as they scroll into view. */
function Reveal() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== '/' || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.pg-landing section > div, .pg-landing footer'))
      .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    targets.forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--rv-delay', `${(i % 2) * 60}ms`); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rv-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}

/** Thin shimmer at the top while data is loading. */
function LoadBar() {
  const { ready, authReady, error } = useStore();
  const on = !authReady || (!ready && !error);
  return (
    <div aria-hidden="true" className={'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-300 ' + (on ? 'opacity-100' : 'opacity-0')}>
      <div className="h-full w-1/3 animate-[shimmer_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-brand to-transparent" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <BrowserRouter>
          <StoreProvider>
            <Links />
            <Reveal />
            <LoadBar />
            <Suspense fallback={<div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/analyze" element={<AnalyzePage />} />
              <Route path="/app/deals" element={<DealsPage />} />
              <Route path="/app/watchlist" element={<WatchlistPage />} />
              <Route path="/app/market" element={<MarketPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              <Route path="*" element={<Landing />} />
            </Routes>
            </Suspense>
            <Toaster position="top-center" />
          </StoreProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
