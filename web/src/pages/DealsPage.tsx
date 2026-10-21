import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealRules, Item, Vehicle } from '../api';
import { AppFrame, ICONS } from '../components/Shell';
import { css } from '../css';
import { pct } from '../format';
import { useStore } from '../store';
import './DealsPage.css';

const tone = (l: string) => (l === 'g' ? 'b-pos' : l === 'r' ? 'b-neg' : l === 'a' ? 'b-warn' : '');
const n = (s: string) => { const v = parseFloat(s.replace(/,/g, '')); return Number.isFinite(v) ? v : NaN; };
const RISKS = [['Low', 'Low only'], ['Medium', 'Up to medium'], ['High', 'Any risk']] as const;

export default function DealsPage() {
  const { rules, updateRules, deals, items, money, setDraft, isWatched, toggleWatch } = useStore();
  const nav = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const [risk, setRisk] = useState<DealRules['maxRisk']>('Medium');
  const [errs, setErrs] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [fc, setFc] = useState('');
  const [fm, setFm] = useState('');
  const [fp, setFp] = useState('');
  const [fk, setFk] = useState('');

  useEffect(() => {
    if (rules.capital == null) return;
    setF({
      capital: String(rules.capital), reservePct: String(rules.reservePct), minPositionPct: String(rules.minPositionPct), maxPositionPct: String(rules.maxPositionPct),
      minProfit: String(rules.minProfit), minMargin: String(rules.minMargin), minROI: String(rules.minROI), maxLoss: String(rules.maxLoss),
    });
    setRisk(rules.maxRisk);
  }, [rules]);

  const draftRules = useMemo<DealRules>(() => ({
    ...rules, capital: n(f.capital ?? ''), reservePct: n(f.reservePct ?? ''), minPositionPct: n(f.minPositionPct ?? ''), maxPositionPct: n(f.maxPositionPct ?? ''),
    minProfit: n(f.minProfit ?? ''), minMargin: n(f.minMargin ?? ''), minROI: n(f.minROI ?? ''), maxLoss: n(f.maxLoss ?? ''), maxRisk: risk,
  }), [rules, f, risk]);

  const validate = (b: DealRules) => {
    const e: string[] = [];
    const vals = [b.capital, b.reservePct, b.minPositionPct, b.maxPositionPct, b.minProfit, b.minMargin, b.minROI, b.maxLoss];
    if (!vals.every(Number.isFinite)) return ['Complete all budget and risk fields with valid numbers.'];
    if (!(b.capital > 0)) e.push('Available capital must be greater than zero.');
    if ([b.minProfit, b.minMargin, b.minROI, b.maxLoss].some((x) => x < 0)) e.push('Profit, ROI, margin and downside limits cannot be negative.');
    if ([b.reservePct, b.minPositionPct, b.maxPositionPct].some((x) => x < 0 || x > 100)) e.push('Reserve and position allocation percentages must be between 0% and 100%.');
    if (b.reservePct >= 100) e.push('The cash reserve must be below 100% to leave capital for purchases.');
    if (b.minPositionPct > b.maxPositionPct) e.push('Minimum per-car allocation cannot exceed the maximum.');
    return e;
  };
  const apply = (b: DealRules) => { const e = validate(b); setErrs(e); if (!e.length) void updateRules(b); };
  const setField = (k: string) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...f, [k]: ev.target.value };
    setF(next);
    const b: DealRules = { ...draftRules, [k]: n(ev.target.value) } as DealRules;
    const e = validate(b); setErrs(e);
    if (!e.length) void updateRules(b);
  };

  const cap = rules.capital != null ? (() => { const reserve = rules.capital * rules.reservePct / 100, dep = rules.capital - reserve; return { reserve, dep, min: dep * rules.minPositionPct / 100, max: dep * rules.maxPositionPct / 100 }; })() : null;
  const makes = useMemo(() => [...new Set(items.map((i) => i.vehicle.make))], [items]);

  const pass = (i: Item) => {
    const v = i.vehicle;
    return (!q || `${v.make} ${v.model}`.toLowerCase().includes(q.toLowerCase())) && (!fc || v.country === fc) && (!fm || v.make === fm)
      && (!fp || v.price <= n(fp)) && (!fk || v.km <= n(fk));
  };
  const matches = deals.matches.filter(pass);
  const excluded = deals.excluded.filter(pass);
  const pool = matches.length + excluded.length;

  const open = (i: Item) => { setDraft(i.vehicle); nav('/app/analyze'); };
  const Star = ({ v }: { v: Vehicle }) => (
    <button className="btn btn-ghost btn-sm" type="button" aria-label={isWatched(v.id) ? 'Remove from watchlist' : 'Add to watchlist'} onClick={() => void toggleWatch(v)}>
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={isWatched(v.id) ? { fill: 'currentColor' } : undefined}>{ICONS.star}</svg>
    </button>
  );
  const err = errs.length > 0;

  return (
    <div className="pg-deals">
      <AppFrame active="/app/deals" crumb="Deal finder">
        <div style={css('padding: 32px; display: flex; flex-direction: column; gap: 24px; max-width: 1240px; box-sizing: border-box; width: 100%;')}>
          <div>
            <h1 style={css('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.03em;')}>Deal finder</h1>
            <p style={css('margin: 4px 0 0; color: var(--mfg);')}>See which vehicles fit your capital, profit targets and downside limits.</p>
          </div>

          <section className="card" aria-label="Budget and risk manager">
            <div style={css('padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid var(--border);')}>
              <div>
                <h2 style={css('margin: 0; font-size: 16px; font-weight: 600;')}>Budget &amp; risk manager</h2>
                <p style={css('margin: 2px 0 0; color: var(--mfg); font-size: 13px; max-width: 620px;')}>Every listing is screened against these rules before it shows as an eligible deal.</p>
              </div>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => { setErrs([]); void updateRules({ capital: 30000, reservePct: 15, minPositionPct: 10, maxPositionPct: 90, minProfit: 500, minMargin: 3, minROI: 3, maxLoss: 1200, maxRisk: 'Medium' }); }}>Reset strategy</button>
            </div>
            {err ? (
              <div role="alert" style={css('margin: 16px 24px 0; padding: 10px 12px; border: 1px solid var(--warn); background: var(--warn-bg); border-radius: 8px; color: var(--warn); font-size: 13px;')}>{errs.join(' ')}</div>
            ) : cap && (
              <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); border-bottom: 1px solid var(--border);')}>
                <div style={css('padding: 16px 24px; border-right: 1px solid var(--border);')}><div style={css('font-size: 13px; color: var(--mfg);')}>Total capital</div><div className="num" style={css('font-size: 22px; font-weight: 600; letter-spacing: -0.02em;')}>{money(rules.capital)}</div></div>
                <div style={css('padding: 16px 24px; border-right: 1px solid var(--border);')}><div style={css('font-size: 13px; color: var(--mfg);')}>Safety reserve</div><div className="num" style={css('font-size: 22px; font-weight: 600; letter-spacing: -0.02em;')}>{money(cap.reserve)}</div></div>
                <div style={css('padding: 16px 24px; border-right: 1px solid var(--border);')}><div style={css('font-size: 13px; color: var(--mfg);')}>Deployable funds</div><div className="num" style={css('font-size: 22px; font-weight: 600; letter-spacing: -0.02em;')}>{money(cap.dep)}</div></div>
                <div style={css('padding: 16px 24px; background: var(--muted);')}><div style={css('font-size: 13px; color: var(--mfg);')}>All-in limit per vehicle</div><div className="num" style={css('font-size: 22px; font-weight: 600; letter-spacing: -0.02em;')}>{money(cap.min)}–{money(cap.max)}</div></div>
              </div>
            )}
            <div style={css('padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px;')}>
              <span className="grp">Capital &amp; position sizing</span>
              <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;')}>
                <div><label htmlFor="cap">Total trading capital (€)</label><input id="cap" className="num" inputMode="decimal" value={f.capital ?? ''} onChange={setField('capital')} /></div>
                <div><label htmlFor="res">Keep uninvested (%)</label><input id="res" className="num" inputMode="decimal" value={f.reservePct ?? ''} onChange={setField('reservePct')} /></div>
                <div><label htmlFor="minp">Minimum per deal (%)</label><input id="minp" className="num" inputMode="decimal" value={f.minPositionPct ?? ''} onChange={setField('minPositionPct')} /></div>
                <div><label htmlFor="maxp">Maximum per deal (%)</label><input id="maxp" className="num" inputMode="decimal" value={f.maxPositionPct ?? ''} onChange={setField('maxPositionPct')} /></div>
              </div>
              <span className="grp" style={{ marginTop: 4 }}>Profit &amp; risk thresholds</span>
              <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;')}>
                <div><label htmlFor="mprof">Min. expected profit (€)</label><input id="mprof" className="num" inputMode="decimal" value={f.minProfit ?? ''} onChange={setField('minProfit')} /></div>
                <div><label htmlFor="mmar">Min. resale margin (%)</label><input id="mmar" className="num" inputMode="decimal" value={f.minMargin ?? ''} onChange={setField('minMargin')} /></div>
                <div><label htmlFor="mroi">Min. ROI on cost (%)</label><input id="mroi" className="num" inputMode="decimal" value={f.minROI ?? ''} onChange={setField('minROI')} /></div>
                <div><label htmlFor="mloss">Max. conservative loss (€)</label><input id="mloss" className="num" inputMode="decimal" value={f.maxLoss ?? ''} onChange={setField('maxLoss')} /></div>
                <div>
                  <label htmlFor="mrisk">Max. risk rating</label>
                  <select id="mrisk" value={risk} onChange={(ev) => { const r = ev.target.value as DealRules['maxRisk']; setRisk(r); apply({ ...draftRules, maxRisk: r }); }}>
                    {RISKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <p style={css('margin: 4px 0 0; font-size: 12px; color: var(--mfg); max-width: 820px;')}>Per-car limits apply to deployable funds after the reserve. All-in cost includes purchase, transport, registration, repairs and selling costs. Monetary inputs are in EUR. These are fictional demo estimates, not verified risk probabilities.</p>
            </div>
          </section>

          <section className="card" style={css('padding: 16px 24px;')} aria-label="Search">
            <div style={css('display: grid; grid-template-columns: 2fr repeat(4, minmax(140px, 1fr)); gap: 12px; align-items: end; overflow-x: auto;')}>
              <div style={css('min-width: 200px;')}>
                <label htmlFor="q">Search</label>
                <div style={css('position: relative;')}>
                  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={{ position: 'absolute', left: 11, top: 10, color: 'var(--mfg)' }}>{ICONS.search}</svg>
                  <input id="q" placeholder="Model, make…" style={{ paddingLeft: 34 }} value={q} onChange={(ev) => setQ(ev.target.value)} />
                </div>
              </div>
              <div><label htmlFor="fc">Source country</label><select id="fc" value={fc} onChange={(ev) => setFc(ev.target.value)}><option value="">All</option>{['DE', 'AT', 'NL', 'BE', 'PL'].map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label htmlFor="fm">Manufacturer</label><select id="fm" value={fm} onChange={(ev) => setFm(ev.target.value)}><option value="">All</option>{makes.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div><label htmlFor="fp">Max asking (€)</label><input id="fp" className="num" inputMode="decimal" placeholder="Any" value={fp} onChange={(ev) => setFp(ev.target.value)} /></div>
              <div><label htmlFor="fk">Max mileage (km)</label><input id="fk" className="num" inputMode="numeric" placeholder="Any" value={fk} onChange={(ev) => setFk(ev.target.value)} /></div>
            </div>
          </section>

          <section className="card" style={css('overflow: hidden;')} aria-live="polite">
            <div style={css('padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--border);')}>
              <div>
                <h2 style={css('margin: 0; font-size: 15px; font-weight: 600;')}>{matches.length} suitable {matches.length === 1 ? 'deal' : 'deals'}</h2>
                <p style={css('margin: 2px 0 0; font-size: 13px; color: var(--mfg);')}>From {pool} demo listings matching your search · {excluded.length} outside your strategy</p>
              </div>
              <div style={css('display: flex; gap: 6px;')}><span className="badge b-pos">{matches.length} within limits</span><span className="badge b-warn">{excluded.length} screened out</span></div>
            </div>
            <div style={css('overflow-x: auto;')}>
              <table>
                <thead><tr><th scope="col">Vehicle</th><th scope="col" className="r">Price</th><th scope="col" className="r">All-in</th><th scope="col" className="r">Est. resale</th><th scope="col" className="r">Net profit</th><th scope="col" className="r">ROI</th><th scope="col">Score</th><th scope="col">Risk</th><th scope="col"><span style={css('position: absolute; left: -9999px;')}>Actions</span></th></tr></thead>
                <tbody>
                  {matches.length === 0 && (
                    <tr><td colSpan={9} style={css('text-align: center; color: var(--mfg); padding: 28px 16px;')}>No deals satisfy these limits. Try a larger per-car allocation, a lower profit requirement or a higher risk allowance. Your criteria are not being ignored.</td></tr>
                  )}
                  {matches.map((i) => {
                    const r = i.result;
                    return (
                      <tr key={i.vehicle.id}>
                        <td><span style={css('display: block; font-weight: 500;')}>{i.vehicle.make} {i.vehicle.model}</span><span style={css('display: block; font-size: 12px; color: var(--mfg);')}>{i.vehicle.year} · {i.vehicle.km.toLocaleString('en-US')} km · {i.vehicle.engine} · {i.vehicle.country}</span></td>
                        <td className="r num">{money(i.vehicle.price)}</td><td className="r num">{money(r.expected.cost)}</td><td className="r num">{money(r.resale)}</td>
                        <td className="r num" style={{ color: r.expected.net >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>{money(r.expected.net)}</td><td className="r num">{pct(r.expected.roi)}</td>
                        <td><span className="badge num">{r.score}</span></td><td><span className={'badge ' + tone(r.riskLevel.level)}>{r.riskLevel.label}</span></td>
                        <td className="r" style={{ whiteSpace: 'nowrap' }}><button className="btn btn-outline btn-sm" type="button" onClick={() => open(i)}>Analyze</button> <Star v={i.vehicle} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {excluded.length > 0 && (
            <details className="card" style={css('overflow: hidden;')}>
              <summary style={css('padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px;')}>
                <span style={css('font-weight: 500;')}>Why were {excluded.length} listings excluded?</span>
                <svg className="ic chev" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--mfg)' }}><path d="m6 9 6 6 6-6" /></svg>
              </summary>
              <div style={css('border-top: 1px solid var(--border);')}>
                {excluded.map((x) => (
                  <div key={x.vehicle.id} style={css('padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;')}>
                    <div style={css('display: flex; flex-direction: column; gap: 8px; min-width: 0;')}>
                      <span style={css('font-weight: 500;')}>{x.vehicle.make} {x.vehicle.model} ({x.vehicle.year})</span>
                      <span style={css('display: flex; gap: 6px; flex-wrap: wrap;')}>{x.reasons.map((why) => <span key={why} className="badge">{why}</span>)}</span>
                    </div>
                    <div className="num" style={css('text-align: right; font-size: 13px; color: var(--mfg); white-space: nowrap;')}>All-in {money(x.result.expected.cost)}<br />Projected <span style={{ color: x.result.expected.net >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{money(x.result.expected.net)}</span></div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </AppFrame>
    </div>
  );
}
