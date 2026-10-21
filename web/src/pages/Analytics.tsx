// @ts-nocheck  (ported from the Design canvas artboard v2/Analytics.dc.html; markup kept verbatim)
import React from 'react';
import './Analytics.css';
import { css } from '../css';
import { V2Sidebar } from '../components/V2Sidebar';
import { useStore } from '../store';
import { photoSrc } from '../api';

function useVals(props: any) {
  const [st, setStRaw] = React.useState<any>({ sc: 1 });
  const setSt = (p: any) => setStRaw((s: any) => ({ ...s, ...p }));
  const { items, deals, rules, money: eur } = useStore();
    const short = (v) => `${v.model}`.split(' ').slice(0, 2).join(' ');
    const raw = items.map((i) => [`${i.vehicle.make === 'Volkswagen' ? 'VW' : i.vehicle.make} ${short(i.vehicle)}`, i.result.conservative.net, i.result.expected.net, i.result.optimistic.net]);
    const loR = Math.min(0, ...raw.map((r) => r[1])), hiR = Math.max(0, ...raw.map((r) => r[3]));
    const lo = Math.floor((loR - 200) / 1000) * 1000, hi = Math.ceil((hiR + 200) / 1000) * 1000, pct = (v) => ((v - lo) / (hi - lo) * 100).toFixed(2) + '%';
    const ranges = raw.map(([name, c, e, o]) => ({
      name, l: pct(c), w: ((o - c) / (hi - lo) * 100).toFixed(2) + '%', d: pct(e),
      bg: e >= 0 ? 'linear-gradient(90deg, rgba(248,113,113,.55), rgba(52,211,153,.75))' : 'linear-gradient(90deg, rgba(248,113,113,.75), rgba(248,113,113,.3))',
      dot: e >= 0 ? 'var(--pos)' : 'var(--neg)', exp: eur(e)
    }));
    const sc = st.sc;
    const total = raw.reduce((s, r) => s + Math.max(0, r[1 + sc]), 0);
    const count = raw.filter((r) => r[1 + sc] > 0).length;
    const names = ['Conservative', 'Expected', 'Optimistic'];
    const tabs = names.map((label, i) => ({ label, cls: i === sc ? 'on' : '', sel: i === sc ? 'true' : 'false', pick: () => setSt({ sc: i }) }));
    const pts = [
      ['Golf 8', 17900, 920, 62, 'l'], ['Octavia', 15200, 705, 98, 'l'], ['320d', 19800, 194, 121, 'l'], ['A4 Avant', 22400, 750, 88, 'l'],
      ['RAV4', 23900, 517, 74, 'l'], ['C 220 d', 16700, -1194, 168, 'm'], ['Leon', 15900, 268, 51, 'l'], ['Tucson', 20400, -1184, 59, 'l'],
      ['Focus', 9800, -892, 134, 'm'], ['Passat', 8900, -2450, 214, 'h'], ['Superb', 24100, -40, 77, 'l'], ['Astra', 15600, -204, 33, 'l']
    ];
    const col = { l: 'var(--blue-t)', m: 'var(--warn)', h: 'var(--neg)' };
    const dots = pts.map(([name, p, n, km, r]) => ({
      name: name + ' · ' + eur(n), x: ((p - 8000) / 16000 * 100).toFixed(1) + '%', y: ((1000 - n) / 4000 * 100).toFixed(1) + '%',
      s: Math.round(10 + km / 12) + 'px', c: col[r]
    }));
    const mk = [['Germany', 21400], ['Poland', 21800], ['Austria', 22900], ['Netherlands', 23100], ['Slovakia', 23300], ['Czechia', 23500]];
    const markets = mk.map(([c, p], i) => ({
      c, p: eur(p), w: (40 + (p - 21000) / 2500 * 60).toFixed(1) + '%',
      bg: i === 0 ? 'var(--pos)' : i === mk.length - 1 ? 'var(--blue)' : '#334155'
    }));
    const sorted = raw.map((r) => ({ n: r[0], e: r[2] })).sort((x, y) => y.e - x.e);
    const LO = Math.min(...raw.map((r) => r[2]), 0) - 250, HI = Math.max(...raw.map((r) => r[2]), rules.minProfit || 0, 0) + 250, PL = 20, PH = 250;
    const y = (v) => PL + (HI - v) / (HI - LO) * PH;
    const bars = sorted.map((r) => {
      const t = r.e >= 0 ? y(r.e) : y(0), h = Math.max(3, Math.abs(y(r.e) - y(0)));
      return { name: r.n.replace('Mercedes C 220 d', 'C 220 d').replace('Škoda ', '').replace('Hyundai ', '').replace(' Avant', ''), v: (r.e < 0 ? '−' : '') + Math.abs(r.e), top: t + 'px', h: h + 'px', c: r.e >= 0 ? 'var(--pos)' : 'var(--neg)', vt: (r.e >= 0 ? t - 15 : t + h + 2) + 'px' };
    });
    const n = items.length || 1;
    const sumPrice = items.reduce((t, i) => t + i.vehicle.price, 0);
    const cc = {};
    items.forEach((i) => { cc[i.vehicle.country] = (cc[i.vehicle.country] || 0) + 1; });
    const palette = ['var(--blue)', '#6366f1', '#8b5cf6', '#0ea5e9', '#94a3b8'];
    const countries = Object.entries(cc).sort((x, y) => y[1] - x[1]).map(([c, k], i) => ({ c, k, bg: palette[i % palette.length] }));
    const avgScore = items.length ? Math.round(items.reduce((t, i) => t + i.result.score, 0) / items.length) : 0;
    const bestScore = items.length ? items.reduce((x, y) => (y.result.score > x.result.score ? y : x)) : null;
    const best = items.length ? items.reduce((x, y) => (y.result.expected.net > x.result.expected.net ? y : x)) : null;
    const matches = deals.matches;
    // donut: costs on top of the purchase price for the best listing
    const donutSrc = best ? [
      ['Repairs', best.result.expected.repairs, '#f59e0b'], ['Fees & selling', best.result.expected.fees, '#3b82f6'], ['Transport', best.result.transport, '#6366f1'],
      ['Holding, ' + best.result.days + ' d', best.result.expected.hold, '#64748b'], ['Registration', best.result.registration, '#8b5cf6'],
    ] : [];
    const extra = donutSrc.reduce((t, d) => t + d[1], 0) || 1;
    let off = 0;
    const donut = donutSrc.map(([label, v, c]) => { const len = v / extra * 100; const d = { label, v: eur(v), c, len: Math.max(0, len - 0.7).toFixed(2), off: off.toFixed(2) }; off += len; return d; });
    const donutName = best ? `${best.vehicle.make} ${best.vehicle.model}` : '';
    const donutExtra = eur(extra);
    const donutPrice = best ? eur(best.vehicle.price) : '';
    const donutPct = best ? (extra / best.vehicle.price * 100).toFixed(1) + '% of price' : '';
    // funnel
    const cap = deals.capital;
    const inBudget = cap ? items.filter((i) => i.result.expected.cost >= cap.min - 0.005 && i.result.expected.cost <= cap.max + 0.005) : items;
    const withProfit = inBudget.filter((i) => i.result.expected.net >= rules.minProfit);
    const funnelSrc = [['All listings', items.length], ['Fit the per-car budget', inBudget.length], ['Profit ≥ ' + eur(rules.minProfit || 0), withProfit.length], ['Margin, ROI, loss and risk', matches.length]];
    const funnel = funnelSrc.map(([label, k], i) => ({ label, k, w: (items.length ? k / items.length * 100 : 0).toFixed(1) + '%', green: i >= 2 }));
    // offer chart
    let offer = null;
    if (best) {
      const A = best.vehicle.price, N = best.result.expected.net, T = best.result.maxPrice, from = A - 2500, to = A + 2500;
      const pmin = N - 2500, pmax = N + 2500;
      const X = (p) => 60 + (p - from) / (to - from) * 920;
      const Y = (profit) => 20 + (pmax - profit) / (pmax - pmin) * 200;
      const yTicks = [0, 1, 2, 3, 4].map((k) => { const v = pmax - k * (pmax - pmin) / 4; return { y: 20 + k * 50, t: eur(v) }; });
      const xTicks = [0, 1, 2, 3, 4, 5].map((k) => ({ x: 60 + k * 184, t: eur(from + k * 1000) }));
      const clampY = (v) => Math.max(20, Math.min(220, v));
      offer = {
        name: best.vehicle.make + ' ' + best.vehicle.model, yTicks, xTicks, line: `M60 ${Y(N + 2500)} L980 ${Y(N - 2500)}`,
        area: `M60 ${Y(N + 2500)} L${X(A + N)} ${clampY(Y(0))} L60 ${clampY(Y(0))} Z`,
        zeroY: clampY(Y(0)), target: { x: X(T), y: Y(N + (A - T)), label: eur(N + (A - T)) + ' at target price' }, ask: { x: X(A), y: Y(N), label: eur(N) + ' at asking' }, be: { x: X(A + N), y: clampY(Y(0)) },
        targetChip: 'Target ' + Math.round(0) + '% ROI ≤ ' + eur(T), askChip: 'Asking ' + eur(A), beChip: 'Break-even ' + eur(A + N),
      };
    }
    return {
      n, sumPrice: eur(sumPrice), countries, avgScore, bestScoreText: bestScore ? `Best: ${bestScore.vehicle.make} ${bestScore.vehicle.model} at ${bestScore.result.score}` : '', scoreDash: (avgScore * 1.0).toFixed(1),
      passN: matches.length, passText: matches.slice(0, 2).map((m) => m.vehicle.model.split(' ').slice(0, 2).join(' ')).join(' and ') || 'No listing passes yet',
      donut, donutName, donutExtra, donutPrice, donutPct, funnel, funnelNote: funnel[2].k < funnel[1].k ? 'The profit target removes deals at this step; lower it in Deal finder to see more.' : 'Every listing in budget meets the profit target.', offer,
      zeroFrac: ((0 - lo) / (hi - lo)).toFixed(4), ticks: [0, 1, 2, 3].map((k) => eur(lo + k * (hi - lo) / 3)), minProfit: eur(rules.minProfit || 0),
      bars, zeroTop: y(0) + 'px', minTop: y(rules.minProfit || 0) + 'px',
      accent: props.accent ?? '#3b82f6',
      tabs, ranges, dots, markets,
      scName: names[sc].toLowerCase(),
      kpiProfit: eur(total), kpiCount: count, kpiShare: (count / 12 * 100).toFixed(1) + '%',
      kpiColor: total > 0 ? 'var(--pos)' : 'var(--neg)'
    };
}

export default function AnalyticsPage() {
  const V = useVals({});
  const { n, sumPrice, countries, avgScore, bestScoreText, scoreDash, passN, passText, donut, donutName, donutExtra, donutPrice, donutPct, funnel, funnelNote, offer, zeroFrac, ticks, minProfit, accent, bars, kpiColor, kpiCount, kpiProfit, kpiShare, markets, minTop, ranges, scName, tabs, zeroTop } = V;
  return (
    <>
<div className="pg-analytics" style={css(`--blue: ${accent}; min-height: 100vh; display: flex; flex-wrap: wrap; align-items: stretch;`)}>
  <svg width="0" height="0" style={css(`position: absolute;`)} aria-hidden="true"><defs><linearGradient id="fpg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b9bff"></stop><stop offset="1" stopColor="#1d4ed8"></stop></linearGradient><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" stopOpacity=".35"></stop><stop offset="1" stopColor="#3b82f6" stopOpacity="0"></stop></linearGradient></defs></svg>

  <V2Sidebar active="/app" />

  <main style={css(`flex: 999 1 560px; min-width: 0; padding: 28px 32px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px;`)}>
    <div style={css(`display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap;`)}>
      <div>
        <span className="pill" style={css(`border-color: rgba(251,191,36,.35); color: var(--warn); margin-bottom: 10px;`)}>Demo data · fictional listings</span>
        <h1 className="disp" style={css(`margin: 0; font-size: 30px; font-weight: 700;`)}>Pipeline analytics</h1>
        <p style={css(`margin: 4px 0 0; color: var(--mfg);`)}>{n} listings from {countries.map((c) => c.c).join(', ')} → Czechia. Expected scenario unless noted.</p>
      </div>
      <div style={css(`display: flex; gap: 10px; align-items: center; flex-wrap: wrap;`)}>
        <div className="seg" role="tablist" aria-label="Scenario">
          {(tabs).map((t, $index) => (<React.Fragment key={$index}><button type="button" role="tab" className={t.cls} aria-selected={t.sel} onClick={t.pick}>{t.label}</button></React.Fragment>))}
        </div>
        <a className="btn btn-p" href="/app/analyze"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>New analysis</a>
      </div>
    </div>

    <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px;`)}>
      <div className="card" style={css(`display: flex; flex-direction: column; gap: 10px;`)}>
        <span style={css(`font-size: 13px; color: var(--mfg);`)}>Pipeline value</span>
        <span className="disp" style={css(`font-size: 28px; font-weight: 700;`)}>{sumPrice}</span>
        <div style={css(`display: flex; gap: 3px; height: 6px;`)}>{countries.map((c) => <i key={c.c} style={{ flex: c.k, background: c.bg, borderRadius: 3 }}></i>)}</div>
        <span style={css(`font-size: 12px; color: var(--mfg);`)}>{countries.map((c) => `${c.c} ${c.k}`).join(' · ')} listings</span>
      </div>
      <div className="card" style={css(`display: flex; flex-direction: column; gap: 10px;`)}>
        <span style={css(`font-size: 13px; color: var(--mfg);`)}>Expected profit · {scName}</span>
        <span className="disp" style={css(`font-size: 28px; font-weight: 700; color: ${kpiColor};`)}>{kpiProfit}</span>
        <div style={css(`height: 6px; border-radius: 3px; background: var(--panel2); overflow: hidden;`)}><div style={css(`height: 100%; width: ${kpiShare}; background: var(--pos);`)}></div></div>
        <span style={css(`font-size: 12px; color: var(--mfg);`)}>{kpiCount} of {n} listings in profit</span>
      </div>
      <div className="card" style={css(`display: flex; flex-direction: column; gap: 10px;`)}>
        <span style={css(`font-size: 13px; color: var(--mfg);`)}>Average deal score</span>
        <div style={css(`display: flex; align-items: center; gap: 12px;`)}>
          <svg width="56" height="56" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="4"></circle><circle cx="18" cy="18" r="15.9" fill="none" stroke="#d97706" strokeWidth="4" strokeDasharray={`${scoreDash} 100`} strokeLinecap="round" transform="rotate(-90 18 18)"></circle></svg>
          <span className="disp" style={css(`font-size: 28px; font-weight: 700;`)}>{avgScore}<span style={css(`font-size: 15px; color: var(--mfg);`)}>/100</span></span>
        </div>
        <span style={css(`font-size: 12px; color: var(--mfg);`)}>{bestScoreText}</span>
      </div>
      <div className="card" style={css(`display: flex; flex-direction: column; gap: 10px;`)}>
        <span style={css(`font-size: 13px; color: var(--mfg);`)}>Pass your strategy</span>
        <span className="disp" style={css(`font-size: 28px; font-weight: 700;`)}>{passN}<span style={css(`font-size: 15px; color: var(--mfg);`)}> of {n}</span></span>
        <div style={css(`display: flex; gap: 3px; height: 6px;`)}><i style={{ flex: passN, background: 'var(--pos)', borderRadius: 3 }}></i><i style={{ flex: Math.max(0, n - passN), background: 'var(--panel2)', borderRadius: 3 }}></i></div>
        <span style={css(`font-size: 12px; color: var(--mfg);`)}>{passText}</span>
      </div>
    </div>

    <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 14px;`)}>
      <section className="card">
        <div style={css(`display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; flex-wrap: wrap;`)}>
          <div><h2 className="ttl">Profit range by vehicle</h2><p className="sub">Bar spans conservative → optimistic. Dot is the expected case.</p></div>
          <div className="lg" style={css(`display: flex; gap: 14px; font-size: 12px; color: var(--mfg);`)}><span><i style={css(`background: var(--pos);`)}></i>Profit</span><span><i style={css(`background: var(--neg);`)}></i>Loss</span></div>
        </div>
        <div style={css(`position: relative; display: flex; flex-direction: column; gap: 9px;`)}>
          <div aria-hidden="true" style={css(`position: absolute; top: 0; bottom: 20px; left: calc(130px + (100% - 196px) * ${zeroFrac}); width: 1px; background: #a3a3a3;`)}></div>
          {(ranges).map((r, $index) => (<React.Fragment key={$index}>
            <div style={css(`display: grid; grid-template-columns: 118px 1fr 66px; gap: 12px; align-items: center; font-size: 12.5px;`)}>
              <span style={css(`white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--mfg);`)}>{r.name}</span>
              <span style={css(`position: relative; height: 14px; display: block;`)}>
                <span style={css(`position: absolute; top: 3px; height: 8px; border-radius: 99px; left: ${r.l}; width: ${r.w}; background: ${r.bg};`)}></span>
                <span style={css(`position: absolute; top: 0; width: 14px; height: 14px; margin-left: -7px; border-radius: 99px; left: ${r.d}; background: ${r.dot}; box-shadow: 0 0 0 3px var(--panel);`)}></span>
              </span>
              <span className="num" style={css(`text-align: right; color: ${r.dot};`)}>{r.exp}</span>
            </div>
          </React.Fragment>))}
          <div className="num" style={css(`display: grid; grid-template-columns: 118px 1fr 66px; gap: 12px; font-size: 11px; color: var(--mfg); padding-top: 4px;`)}>
            <span></span>
            <span style={css(`display: flex; justify-content: space-between;`)}>{ticks.map((t, i) => <span key={i}>{t}</span>)}</span>
            <span></span>
          </div>
        </div>
      </section>

      <section className="card">
        <div style={css(`display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;`)}>
          <div><h2 className="ttl">Expected profit by vehicle</h2><p className="sub">Ranked best to worst. Dashed line is your {minProfit} minimum profit.</p></div>
          <div className="lg" style={css(`display: flex; gap: 14px; font-size: 12px; color: var(--mfg);`)}><span><i style={css(`background: var(--pos);`)}></i>Profit</span><span><i style={css(`background: var(--neg);`)}></i>Loss</span></div>
        </div>
        <div style={css(`position: relative; height: 300px; display: flex; gap: 6px; padding-top: 4px;`)}>
          <div aria-hidden="true" style={css(`position: absolute; left: 0; right: 0; top: ${zeroTop}; border-top: 1px solid var(--fg); opacity: .35;`)}></div>
          <div aria-hidden="true" style={css(`position: absolute; left: 0; right: 0; top: ${minTop}; border-top: 1px dashed var(--pos);`)}></div>
          {(bars).map((b, $index) => (<React.Fragment key={$index}>
            <div style={css(`position: relative; flex: 1; min-width: 0;`)} title={b.name}>
              <div style={css(`position: absolute; left: 14%; right: 14%; border-radius: 5px; top: ${b.top}; height: ${b.h}; background: ${b.c};`)}></div>
              <div className="num" style={css(`position: absolute; left: -6px; right: -6px; text-align: center; font-size: 10.5px; top: ${b.vt}; color: var(--fg);`)}>{b.v}</div>
              <div style={css(`position: absolute; left: -4px; right: -4px; bottom: 0; text-align: center; font-size: 10.5px; color: var(--mfg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`)}>{b.name}</div>
            </div>
          </React.Fragment>))}
        </div>
      </section>
    </div>

    <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 14px;`)}>
      <section className="card">
        <h2 className="ttl">Costs on top of purchase</h2>
        <p className="sub">{donutName} · {donutExtra} beyond the {donutPrice} price</p>
        <div style={css(`display: flex; align-items: center; gap: 20px; margin-top: 16px; flex-wrap: wrap;`)}>
          <div style={css(`position: relative; width: 150px; height: 150px; flex: none;`)}>
            <svg width="150" height="150" viewBox="0 0 36 36" role="img" aria-label="Cost structure donut chart">
              <g fill="none" strokeWidth="4.2" transform="rotate(-90 18 18)">
                {donut.map((d, i) => <circle key={i} cx="18" cy="18" r="15.9155" stroke={d.c} strokeDasharray={`${d.len} ${100 - d.len}`} strokeDashoffset={-d.off}></circle>)}
              </g>
            </svg>
            <div style={css(`position: absolute; inset: 0; display: grid; place-items: center; text-align: center;`)}><div><div className="disp" style={css(`font-size: 20px; font-weight: 700;`)}>{donutExtra}</div><div style={css(`font-size: 11px; color: var(--mfg);`)}>{donutPct}</div></div></div>
          </div>
          <div style={css(`flex: 1; min-width: 150px; display: flex; flex-direction: column; gap: 8px; font-size: 13px;`)}>
            {donut.map((d, i) => <div key={i} style={css(`display: flex; justify-content: space-between;`)}><span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: d.c, marginRight: 8 }}></i>{d.label}</span><span className="num">{d.v}</span></div>)}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="ttl">Same car, six markets</h2>
        <p className="sub">VW Golf 8 2.0 TDI, 2021 · reference resale prices</p>
        <div style={css(`display: flex; flex-direction: column; gap: 11px; margin-top: 16px;`)}>
          {(markets).map((m, $index) => (<React.Fragment key={$index}>
            <div style={css(`display: grid; grid-template-columns: 92px 1fr 64px; gap: 10px; align-items: center; font-size: 13px;`)}>
              <span style={css(`color: var(--mfg);`)}>{m.c}</span>
              <span style={css(`height: 10px; border-radius: 99px; background: var(--panel2); display: block; overflow: hidden;`)}><span style={css(`display: block; height: 100%; border-radius: 99px; width: ${m.w}; background: ${m.bg};`)}></span></span>
              <span className="num" style={css(`text-align: right;`)}>{m.p}</span>
            </div>
          </React.Fragment>))}
        </div>
        <div style={css(`margin-top: 16px; padding: 10px 12px; border-radius: 10px; background: rgba(52,211,153,.08); border: 1px solid rgba(52,211,153,.25); font-size: 13px;`)}>Germany → Czechia spread <b className="num" style={css(`color: var(--pos);`)}>€2,100</b> (9.8%) before costs</div>
      </section>

      <section className="card">
        <h2 className="ttl">Strategy screening</h2>
        <p className="sub">How the {n} listings drop out at each rule</p>
        <div style={css(`display: flex; flex-direction: column; gap: 12px; margin-top: 16px;`)}>
          {funnel.map((f, i) => <div key={i}><div style={css(`display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;`)}><span>{f.label}</span><span className="num">{f.k}</span></div><div style={{ height: 26, borderRadius: 7, background: f.green ? 'linear-gradient(90deg, #059669, #34d399)' : 'linear-gradient(90deg, #2563eb, #3b82f6)', width: f.w, minWidth: f.k ? 6 : 0 }}></div></div>)}
        </div>
        <p style={css(`margin: 14px 0 0; font-size: 12.5px; color: var(--mfg);`)}>{funnelNote}</p>
      </section>
    </div>

    {offer && <section className="card">
      <div style={css(`display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;`)}>
        <div><h2 className="ttl">What should I offer? · {offer.name}</h2><p className="sub">Expected net profit at each purchase price. Every €1 off the price is €1 of profit.</p></div>
        <div style={css(`display: flex; gap: 8px; flex-wrap: wrap;`)}><span className="pill" style={css(`color: var(--blue); border-color: rgba(37,99,235,.35);`)}>{offer.targetChip}</span><span className="pill">{offer.askChip}</span><span className="pill" style={css(`color: var(--neg); border-color: rgba(220,38,38,.35);`)}>{offer.beChip}</span></div>
      </div>
      <svg viewBox="0 0 1000 260" width="100%" role="img" aria-label="Line chart: expected profit falls one-for-one as the purchase price rises" style={css(`display: block; margin-top: 12px;`)}>
        <g stroke="var(--border)" strokeWidth="1">{offer.yTicks.map((t, i) => <line key={i} x1="60" y1={t.y} x2="980" y2={t.y}></line>)}</g>
        <g fontFamily="Geist Mono, monospace" fontSize="12" fill="#737373" textAnchor="end">{offer.yTicks.map((t, i) => <text key={i} x="54" y={t.y + 4}>{t.t}</text>)}</g>
        <g fontFamily="Geist Mono, monospace" fontSize="12" fill="#737373" textAnchor="middle">{offer.xTicks.map((t, i) => <text key={i} x={t.x} y="252">{t.t}</text>)}</g>
        <line x1="60" y1={offer.zeroY} x2="980" y2={offer.zeroY} stroke="#a3a3a3" strokeDasharray="3 3"></line>
        <path d={offer.area} fill="url(#area)"></path>
        <path d={offer.line} stroke="#2563eb" strokeWidth="3" fill="none" strokeLinecap="round"></path>
        <line x1={offer.target.x} y1="20" x2={offer.target.x} y2="220" stroke="#2563eb" strokeDasharray="4 4"></line>
        <line x1={offer.ask.x} y1="20" x2={offer.ask.x} y2="220" stroke="#171717" strokeDasharray="4 4" opacity=".5"></line>
        <line x1={offer.be.x} y1="20" x2={offer.be.x} y2="220" stroke="#dc2626" strokeDasharray="4 4"></line>
        <circle cx={offer.target.x} cy={offer.target.y} r="6" fill="#2563eb" stroke="var(--panel)" strokeWidth="3"></circle>
        <circle cx={offer.ask.x} cy={offer.ask.y} r="6" fill="#171717" stroke="var(--panel)" strokeWidth="3"></circle>
        <circle cx={offer.be.x} cy={offer.be.y} r="6" fill="#dc2626" stroke="var(--panel)" strokeWidth="3"></circle>
        <g fontFamily="Geist, sans-serif" fontSize="13" fill="#171717"><text x={offer.target.x + 10} y={offer.target.y - 10}>{offer.target.label}</text><text x={offer.ask.x + 10} y={offer.ask.y - 10}>{offer.ask.label}</text></g>
      </svg>
    </section>}
  </main>
</div>
    </>
  );
}
