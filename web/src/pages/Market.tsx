// @ts-nocheck  (ported from the Design canvas artboard v2/Market.dc.html; markup kept verbatim)
import React from 'react';
import './Market.css';
import { css } from '../css';
import { V2Sidebar } from '../components/V2Sidebar';
import { useStore } from '../store';
import { photoSrc } from '../api';

function useVals(props: any) {
  const [st, setStRaw] = React.useState<any>({ k: 0 });
  const setSt = (p: any) => setStRaw((s: any) => ({ ...s, ...p }));
  const { money: eur } = useStore();
    const M = [
      ['VW Golf 8 2.0 TDI, 2021', { Germany: 21400, Poland: 21800, Austria: 22900, Netherlands: 23100, Slovakia: 23300, Czechia: 23500 }],
      ['Škoda Octavia 2.0 TDI, 2020', { Germany: 17400, Poland: 18100, Austria: 18900, Netherlands: 19400, Slovakia: 19200, Czechia: 19600 }],
      ['BMW 320d xDrive, 2019', { Germany: 21800, Poland: 22400, Austria: 23500, Netherlands: 23700, Slovakia: 23800, Czechia: 24200 }],
      ['Toyota RAV4 Hybrid, 2020', { Germany: 25900, Poland: 26700, Austria: 27400, Netherlands: 27900, Slovakia: 28100, Czechia: 28600 }]
    ];
    const tabs = M.map(([label], i) => ({ label: label.split(',')[0], cls: i === st.k ? 'on' : '', sel: i === st.k ? 'true' : 'false', pick: () => setSt({ k: i }) }));
    const d = M[st.k][1];
    const e = Object.entries(d).sort((a, b) => a[1] - b[1]);
    const lo = e[0][1], hi = e[e.length - 1][1];
    const bars = e.map(([c, p]) => ({ c, p: eur(p), w: (45 + (p - lo) / (hi - lo || 1) * 55).toFixed(1) + '%', bg: p === lo ? 'var(--pos)' : p === hi ? 'var(--blue)' : 'oklch(0.75 0 0)' }));
    const sp = d.Czechia - d.Germany;
    return {
      rootClass: props.dark ? 'pg-market dark' : 'pg-market', tabs, bars,
      spread: eur(sp), spreadPct: (sp / d.Germany * 100).toFixed(1) + '%',
      afterCosts: eur(sp - 750), fx1: 70, fx2: Math.max(6, 750 / sp * 20), fx3: Math.max(8, (sp - 750) / sp * 20),
    };
}

export default function MarketPage() {
  const V = useVals({});
  const { afterCosts, bars, fx1, fx2, fx3, rootClass, spread, spreadPct, tabs } = V;
  return (
    <>
<div className={rootClass} style={css(`min-height: 100vh; display: flex; flex-wrap: wrap; align-items: stretch;`)}>
  <svg width="0" height="0" style={css(`position: absolute;`)} aria-hidden="true"><defs><linearGradient id="m1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b9bff"></stop><stop offset="1" stopColor="#1d4ed8"></stop></linearGradient></defs></svg>
  <V2Sidebar active="/app/market" />

  <main style={css(`flex: 999 1 560px; min-width: 0; padding: 32px; box-sizing: border-box; display: flex; flex-direction: column; gap: 22px;`)}>
    <div style={css(`display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap;`)}>
      <div><h1 style={css(`margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.03em;`)}>Market intelligence</h1><p style={css(`margin: 4px 0 0; color: var(--mfg);`)}>Compare reference prices for the same vehicle across countries.</p></div>
      <span className="badge" style={css(`color: #b45309; background: #fffbeb; border-color: transparent;`)}>Fictional demo reference prices</span>
    </div>

    <div className="seg" role="tablist" aria-label="Vehicle" style={css(`align-self: flex-start;`)}>
      {(tabs).map((t, $index) => (<React.Fragment key={$index}><button type="button" role="tab" className={t.cls} aria-selected={t.sel} onClick={t.pick}>{t.label}</button></React.Fragment>))}
    </div>

    <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px;`)}>
      <section className="card" style={css(`padding: 24px;`)}>
        <h2 style={css(`margin: 0; font-size: 15px; font-weight: 600;`)}>Resale price by country</h2>
        <p style={css(`margin: 2px 0 18px; font-size: 12.5px; color: var(--mfg);`)}>Cheapest market in green, most expensive in blue.</p>
        <div style={css(`display: flex; flex-direction: column; gap: 14px;`)}>
          {(bars).map((b, $index) => (<React.Fragment key={$index}>
            <div style={css(`display: grid; grid-template-columns: 100px 1fr 70px; gap: 12px; align-items: center; font-size: 13px;`)}>
              <span style={css(`font-weight: 500;`)}>{b.c}</span>
              <span style={css(`height: 12px; border-radius: 99px; background: var(--muted); display: block; overflow: hidden;`)}><span style={css(`display: block; height: 100%; border-radius: 99px; width: ${b.w}; background: ${b.bg};`)}></span></span>
              <span className="num" style={css(`text-align: right;`)}>{b.p}</span>
            </div>
          </React.Fragment>))}
        </div>
      </section>

      <section className="card" style={css(`padding: 24px; display: flex; flex-direction: column; gap: 14px;`)}>
        <div><div style={css(`font-size: 13px; color: var(--mfg);`)}>Germany → Czechia gross spread</div><div className="num" style={css(`font-size: 44px; font-weight: 600; letter-spacing: -0.04em; color: var(--pos); line-height: 1.1;`)}>{spread}</div><div style={css(`font-size: 13px; color: var(--mfg);`)}>{spreadPct} before costs</div></div>
        <div style={css(`display: flex; height: 40px; border-radius: 10px; overflow: hidden; gap: 2px;`)}>
          <div style={css(`flex: ${fx1}; background: var(--fg); display: grid; place-items: center; color: var(--bg); font-size: 11px;`)}>Buy</div>
          <div style={css(`flex: ${fx2}; background: #6366f1; display: grid; place-items: center; color: #fff; font-size: 11px;`)}>Costs</div>
          <div style={css(`flex: ${fx3}; background: var(--pos); display: grid; place-items: center; color: #fff; font-size: 11px;`)}>Net</div>
        </div>
        <div style={css(`display: flex; flex-direction: column; font-size: 13px;`)}>
          <div style={css(`display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);`)}><span style={css(`color: var(--mfg);`)}>Transport DE → CZ</span><span className="num">€450</span></div>
          <div style={css(`display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);`)}><span style={css(`color: var(--mfg);`)}>Registration</span><span className="num">€300</span></div>
          <div style={css(`display: flex; justify-content: space-between; padding: 8px 0;`)}><span style={css(`font-weight: 500;`)}>Left after fixed costs</span><span className="num" style={css(`font-weight: 600;`)}>{afterCosts}</span></div>
        </div>
      </section>
    </div>
  </main>
</div>
    </>
  );
}
