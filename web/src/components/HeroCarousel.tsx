import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, Result, Vehicle } from '../api';
import { makeMoney } from '../format';
import './HeroCarousel.css';

// Fictional examples from the original landing page; each is analyzed by the backend.
const ROWS: [string, string, number, number, string, string, Vehicle['cond'], string, number, number, string][] = [
  ['Volkswagen', 'Golf VI 2.0 TDI', 2012, 207000, 'Diesel', 'Manual', 'Fair', 'DE', 4200, 6800, 'High-mileage budget diesel'],
  ['Toyota', 'Corolla Hybrid', 2022, 53000, 'Hybrid', 'Automatic', 'Excellent', 'DE', 18800, 24200, 'Recent hybrid with positive potential'],
  ['BMW', '320d Touring', 2016, 168000, 'Diesel', 'Automatic', 'Good', 'DE', 9900, 12000, 'High running costs and a thin spread'],
  ['Škoda', 'Octavia 2.0 TDI', 2019, 124000, 'Diesel', 'Manual', 'Good', 'DE', 11800, 16400, 'Mid-market German to Czech flip'],
  ['Audi', 'A4 Avant 40 TDI', 2023, 48000, 'Diesel', 'Automatic', 'Excellent', 'AT', 24700, 29500, 'Newer premium wagon'],
  ['Mercedes-Benz', 'C 220 CDI', 2013, 220000, 'Diesel', 'Automatic', 'Poor', 'DE', 9200, 10900, 'Costly high-mileage car with poor condition'],
  ['Tesla', 'Model 3 Long Range', 2020, 115000, 'Electric', 'Automatic', 'Good', 'NL', 21800, 24300, 'Small spread after importing and preparation'],
  ['Peugeot', '308 1.5 BlueHDi', 2018, 148000, 'Diesel', 'Manual', 'Fair', 'BE', 6100, 10500, 'Older hatchback with repairs to inspect'],
  ['Hyundai', 'Tucson 1.6 T-GDI', 2024, 29000, 'Petrol', 'Automatic', 'Excellent', 'NL', 24900, 30700, 'Low-mileage newer SUV'],
  ['Škoda', 'Fabia 1.2 TSI', 2015, 151000, 'Petrol', 'Manual', 'Good', 'DE', 3900, 7000, 'Older Czech-market favorite'],
];
const COUNTRY: Record<string, string> = { DE: 'Germany', AT: 'Austria', NL: 'Netherlands', BE: 'Belgium', PL: 'Poland' };
const IMAGES = 6; // /cars/hero-0..5.webp belong to the first six examples
const INTERVAL = 6800;

const EXAMPLES: Vehicle[] = ROWS.map((a, i) => ({
  id: `hero-${i}`, make: a[0], model: a[1], year: a[2], km: a[3], engine: a[4], trans: a[5], cond: a[6], country: a[7],
  price: a[8], resale: a[9], desc: a[10], days: 45, transport: null, repairs: null, demo: true,
}));

const money = makeMoney({ name: '', cur: 'EUR', target: 12, reg: 300, fees: 250, day: 8, fxCZK: 25, fxPLN: 4.3 });

function Gauge({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--pos)' : score >= 50 ? 'var(--blue)' : score >= 30 ? 'var(--warn)' : 'var(--neg)';
  return (
    <div className="hc-gauge" role="img" aria-label={`Deal score ${score} out of 100`}>
      <svg viewBox="0 0 120 70" width="104">
        <path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke="var(--muted)" strokeWidth="10" strokeLinecap="round" />
        <path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${Math.max(0.1, score) * 1.57} 157`} />
      </svg>
      <span className="num">{score}</span>
    </div>
  );
}

export default function HeroCarousel() {
  const [results, setResults] = useState<(Result | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    Promise.all(EXAMPLES.map((v) => api.analyze(v).catch(() => null))).then((r) => live && setResults(r));
    return () => { live = false; };
  }, []);

  const go = useCallback((step: number) => {
    setDir(step);
    setIndex((i) => (i + step + EXAMPLES.length) % EXAMPLES.length);
  }, []);

  // Auto-advance, unless hovered/focused, hidden, or the user prefers reduced motion.
  useEffect(() => {
    if (paused || !results.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => { if (!document.hidden) go(1); else setIndex((i) => i); }, INTERVAL);
    return () => clearTimeout(t);
  }, [index, paused, results.length, go]);

  const v = EXAMPLES[index];
  const r = results[index];
  const e = r?.expected;
  const status = !e ? null : e.net >= 1500 ? ['Positive potential', 'pos'] : e.net >= 0 ? ['Narrow margin', 'warn'] : ['Possible loss', 'neg'];

  return (
    <div
      ref={root}
      className="card hc"
      aria-roledescription="carousel"
      aria-label="Example vehicle analyses"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(ev) => { if (ev.key === 'ArrowRight') go(1); if (ev.key === 'ArrowLeft') go(-1); }}
    >
      <div key={index} className={'hc-slide ' + (dir > 0 ? 'from-right' : 'from-left')} aria-live="polite">
        <div className="hc-head">
          <div>
            <div className="hc-title">{v.make} {v.model}, {v.year}</div>
            <div className="hc-route">Buy in {COUNTRY[v.country]} · Sell in Czechia · {v.km.toLocaleString('en-US')} km</div>
          </div>
          {status && <span className={'hc-status ' + status[1]}>{status[0]}</span>}
        </div>

        {index < IMAGES && (
          <div className="hc-photo"><img src={`/cars/hero-${index}.webp`} alt={`${v.make} ${v.model}`} loading={index === 0 ? 'eager' : 'lazy'} /></div>
        )}

        {e && r ? (
          <>
            <div className="hc-rows">
              <div><span>Purchase</span><b className="num">{money(v.price)}</b></div>
              <div><span>Costs on top</span><b className="num">{money(e.cost - v.price)}</b></div>
              <div><span>Expected resale</span><b className="num">{money(e.resale)}</b></div>
            </div>
            <div className="hc-profit">
              <div>
                <span className="hc-muted">Projected net {e.net >= 0 ? 'profit' : 'loss'}</span>
                <div className={'hc-big num ' + (e.net >= 0 ? 'pos' : 'neg')}>{money(e.net)}</div>
              </div>
              <Gauge score={r.score} />
            </div>
          </>
        ) : (
          <div className="hc-skeleton" aria-hidden="true"><i /><i /><i /></div>
        )}
      </div>

      <div className="hc-controls">
        <span className="hc-hint">Fictional example. Use the arrows or ← →.</span>
        <div className="hc-buttons">
          <span className="hc-counter num">{index + 1} / {EXAMPLES.length}</span>
          <button type="button" aria-label="Previous example" onClick={() => go(-1)}>‹</button>
          <button type="button" aria-label="Next example" onClick={() => go(1)}>›</button>
        </div>
      </div>
      <div className="hc-progress" aria-hidden="true"><i key={`${index}-${paused}`} className={paused ? '' : 'run'} /></div>
    </div>
  );
}
