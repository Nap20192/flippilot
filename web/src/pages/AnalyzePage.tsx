import React, { useEffect, useMemo, useState } from 'react';
import { api, Result, Vehicle } from '../api';
import { AppFrame, ICONS } from '../components/Shell';
import { css } from '../css';
import { pct } from '../format';
import { useStore } from '../store';
import './AnalyzePage.css';

const SCEN = ['Conservative', 'Expected', 'Optimistic'] as const;
const CONDS = ['Excellent', 'Good', 'Fair', 'Poor'] as const;
const COUNTRIES = [['DE', 'Germany (DE)'], ['AT', 'Austria (AT)'], ['NL', 'Netherlands (NL)'], ['BE', 'Belgium (BE)'], ['PL', 'Poland (PL)']] as const;

type Form = Record<'make' | 'model' | 'year' | 'km' | 'price' | 'resale' | 'transport' | 'repairs' | 'days' | 'desc' | 'url', string> & { engine: string; trans: string; cond: Vehicle['cond']; country: string };
const toForm = (v: Vehicle): Form => ({
  make: v.make, model: v.model, year: String(v.year), km: String(v.km), price: String(v.price), resale: v.resale ? String(v.resale) : '',
  transport: v.transport == null ? '' : String(v.transport), repairs: v.repairs == null ? '' : String(v.repairs), days: String(v.days),
  desc: v.desc, url: v.url ?? '', engine: v.engine, trans: v.trans, cond: v.cond, country: v.country,
});
const num = (s: string) => { const n = parseFloat(s.replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const toVehicle = (f: Form, base: Vehicle): Vehicle => ({
  ...base, make: f.make, model: f.model, year: num(f.year), km: num(f.km), price: num(f.price), resale: num(f.resale),
  transport: f.transport === '' ? null : num(f.transport), repairs: f.repairs === '' ? null : num(f.repairs),
  days: num(f.days) || 45, desc: f.desc, url: f.url, engine: f.engine, trans: f.trans, cond: f.cond, country: f.country,
});

const tone = (l: string) => (l === 'g' ? 'b-pos' : l === 'r' ? 'b-neg' : l === 'a' ? 'b-warn' : '');

export default function AnalyzePage() {
  const { items, draft, setDraft, money, settings, isWatched, toggleWatch, saveAnalysis } = useStore();
  const base = useMemo(() => items[0]?.vehicle, [items]);
  const [form, setForm] = useState<Form | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [scen, setScen] = useState<(typeof SCEN)[number]>('Expected');
  const [note, setNote] = useState('');

  useEffect(() => { if (!form && !draft && base) { setVehicle(base); setForm(toForm(base)); } }, [base, form, draft]);
  useEffect(() => { if (draft) { setVehicle(draft); setForm(toForm(draft)); setDraft(null); setNote(''); } }, [draft, setDraft]);
  useEffect(() => {
    if (!form || !vehicle) return;
    const v = toVehicle(form, vehicle);
    if (!(v.price > 0)) { setRes(null); return; }
    let live = true;
    const t = setTimeout(() => { api.analyze(v).then((r) => live && setRes(r)).catch(() => live && setRes(null)); }, 150);
    return () => { live = false; clearTimeout(t); };
  }, [form, vehicle, settings]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => form && setForm({ ...form, [k]: e.target.value });
  const watched = !!vehicle && isWatched(vehicle.id);
  const c = res && (scen === 'Conservative' ? res.conservative : scen === 'Optimistic' ? res.optimistic : res.expected);
  const price = form ? num(form.price) : 0;
  const e = res?.expected;

  const rows = res && c && form ? [
    ['Purchase price', price, 'var(--c1)'], [`Transport ${form.country} → CZ`, res.transport, 'var(--c2)'], ['Registration', res.registration, 'var(--c3)'],
    [`Repairs${form.repairs === '' ? ' (auto)' : ''}`, c.repairs, 'var(--warn)'], [`Holding, ${res.days} days`, c.hold, 'var(--c4)'], ['Fees & selling', c.fees, 'var(--c5)'],
  ] as const : [];
  const top = res ? Math.max(price, res.resale) : 1;
  const dot = (color: string) => <i style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />;

  return (
    <div className="pg-analyze">
      <AppFrame active="/app/analyze" crumb="Analyze vehicle">
        <div style={css('padding: 32px; display: flex; flex-direction: column; gap: 24px; max-width: 1240px; box-sizing: border-box; width: 100%;')}>
          <div style={css('display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap;')}>
            <div>
              <h1 style={css('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.03em;')}>Analyze vehicle</h1>
              <p style={css('margin: 4px 0 0; color: var(--mfg);')}>Enter specs and every number on the right updates live.</p>
            </div>
            {vehicle && (
              <div style={css('display: flex; gap: 8px;')}>
                <button className="btn btn-outline" type="button" onClick={() => void toggleWatch(form ? toVehicle(form, vehicle) : vehicle)}>
                  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">{ICONS.star}</svg>{watched ? 'On watchlist' : 'Add to watchlist'}
                </button>
                <button className="btn btn-primary" type="button" onClick={() => { if (form) { void saveAnalysis(toVehicle(form, vehicle)); setNote('Analysis saved'); setTimeout(() => setNote(''), 2500); } }}>
                  {note || 'Save analysis'}
                </button>
              </div>
            )}
          </div>

          {form && (
            <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 24px; align-items: start;')}>
              <form className="card" style={css('padding: 24px; display: flex; flex-direction: column; gap: 20px;')} aria-label="Vehicle details" onSubmit={(ev) => ev.preventDefault()}>
                <div>
                  <h2 style={css('margin: 0; font-size: 16px; font-weight: 600;')}>Vehicle details</h2>
                  <p style={css('margin: 2px 0 0; color: var(--mfg); font-size: 13px;')}>Listing import isn’t connected yet. Enter the specs manually.</p>
                </div>
                <div><label htmlFor="url">Listing URL (optional)</label><input id="url" placeholder="https://www.mobile.de/…" value={form.url} onChange={set('url')} /></div>
                <div style={css('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;')}>
                  <div><label htmlFor="make">Manufacturer</label><input id="make" value={form.make} onChange={set('make')} /></div>
                  <div><label htmlFor="model">Model</label><input id="model" value={form.model} onChange={set('model')} /></div>
                  <div><label htmlFor="year">Year</label><input id="year" className="num" inputMode="numeric" value={form.year} onChange={set('year')} /></div>
                  <div><label htmlFor="km">Mileage (km)</label><input id="km" className="num" inputMode="numeric" value={form.km} onChange={set('km')} /></div>
                  <div><label htmlFor="eng">Engine</label><select id="eng" value={form.engine} onChange={set('engine')}>{['Diesel', 'Petrol', 'Hybrid', 'Electric'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div><label htmlFor="tr">Transmission</label><select id="tr" value={form.trans} onChange={set('trans')}>{['Manual', 'Automatic'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div><label htmlFor="cond">Condition</label><select id="cond" value={form.cond} onChange={set('cond')}>{CONDS.map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div><label htmlFor="ctry">Purchase country</label><select id="ctry" value={form.country} onChange={set('country')}>{COUNTRIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                </div>
                <div style={css('height: 1px; background: var(--border);')} />
                <div style={css('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;')}>
                  <div><label htmlFor="price">Purchase price (€)</label><input id="price" className="num" inputMode="decimal" value={form.price} onChange={set('price')} /></div>
                  <div><label htmlFor="resale">Expected resale in CZ (€)</label><input id="resale" className="num" inputMode="decimal" placeholder="Estimate" value={form.resale} onChange={set('resale')} /></div>
                  <div><label htmlFor="tp">Transport (€)</label><input id="tp" className="num" inputMode="decimal" placeholder="Default by country" value={form.transport} onChange={set('transport')} /></div>
                  <div><label htmlFor="rep">Repairs (€)</label><input id="rep" className="num" inputMode="decimal" placeholder="Auto estimate" value={form.repairs} onChange={set('repairs')} /></div>
                  <div><label htmlFor="days">Days to sell</label><input id="days" className="num" inputMode="numeric" value={form.days} onChange={set('days')} /></div>
                </div>
                <div>
                  <label htmlFor="desc">Description</label>
                  <textarea id="desc" rows={3} value={form.desc} onChange={set('desc')} />
                  <p style={css('margin: 6px 0 0; font-size: 12px; color: var(--mfg);')}>Warning terms like “Unfall”, “defekt” or “export” raise the risk score.</p>
                </div>
              </form>

              <div style={css('display: flex; flex-direction: column; gap: 16px; min-width: 0;')}>
                {!res || !c || !e ? (
                  <div className="card" style={css('padding: 24px; color: var(--mfg);')}>Enter a purchase price to see the analysis.</div>
                ) : (
                  <>
                    <section className="card" style={css('padding: 24px; display: flex; flex-direction: column; gap: 20px;')} aria-label="Result">
                      <div style={css('display: flex; gap: 24px; align-items: center; flex-wrap: wrap;')}>
                        <div style={css('position: relative; width: 132px; flex: none;')}>
                          <svg viewBox="0 0 120 70" width="132" role="img" aria-label={`Deal score ${res.score} out of 100`}>
                            <path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke="var(--muted)" strokeWidth="9" strokeLinecap="round" />
                            <path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke={res.score >= 70 ? 'var(--pos)' : res.score >= 50 ? 'var(--blue)' : res.score >= 30 ? 'var(--warn)' : 'var(--neg)'} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${Math.max(0.1, res.score) * 1.57} 157`} />
                          </svg>
                          <div className="num" style={css('position: absolute; left: 0; right: 0; top: 30px; text-align: center; font-size: 30px; font-weight: 600; letter-spacing: -0.03em;')}>{res.score}</div>
                          <div style={css('text-align: center; margin-top: 4px;')}><span className={'badge ' + tone(res.verdict.level)}>{res.verdict.label}</span></div>
                        </div>
                        <div style={css('flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px;')}>
                          <span style={css('color: var(--mfg); font-size: 13px;')}>Net profit · {scen.toLowerCase()}</span>
                          <span className="num" style={{ ...css('font-size: 40px; font-weight: 600; letter-spacing: -0.04em; line-height: 1.1;'), color: c.net >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{money(c.net)}</span>
                          <span style={css('color: var(--mfg); font-size: 13px;')}><span className="num">{pct(c.roi)}</span> ROI on <span className="num">{money(c.cost)}</span> all-in · Risk <span className={'badge ' + tone(res.riskLevel.level)} style={css('height: 20px;')}>{res.riskLevel.label}</span></span>
                        </div>
                      </div>
                      <div role="tablist" aria-label="Scenario" style={css('display: flex; gap: 4px; padding: 3px; background: var(--muted); border-radius: 9px;')}>
                        {SCEN.map((s) => (
                          <button key={s} type="button" role="tab" aria-selected={s === scen} className={s === scen ? 'tab on' : 'tab'} onClick={() => setScen(s)}>{s}</button>
                        ))}
                      </div>
                      {price > res.maxPrice ? (
                        <div style={css('display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; background: var(--warn-bg); color: var(--fg); font-size: 13px;')}>
                          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--warn)', marginTop: 2 }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                          <span>Asking price is <b className="num">{money(price - res.maxPrice)}</b> above the <b className="num">{money(res.maxPrice)}</b> limit for a {settings.target}% target ROI. Negotiate or pass.</span>
                        </div>
                      ) : (
                        <div style={css('display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; background: var(--pos-bg); color: var(--fg); font-size: 13px;')}>
                          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--pos)', marginTop: 2 }}><path d="M20 6 9 17l-5-5" /></svg>
                          <span>Asking price leaves <b className="num">{money(res.maxPrice - price)}</b> of headroom below the <b className="num">{money(res.maxPrice)}</b> limit.</span>
                        </div>
                      )}
                    </section>

                    <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;')}>
                      <section className="card" style={css('padding: 20px;')}>
                        <h3 style={css('margin: 0 0 14px; font-size: 15px; font-weight: 600;')}>Cost breakdown</h3>
                        <div style={css('display: flex; height: 8px; border-radius: 99px; overflow: hidden; gap: 2px; margin-bottom: 8px;')}>
                          {rows.map(([l, v, col]) => <div key={l} style={{ width: `${(v / c.cost) * 100}%`, background: col }} />)}
                        </div>
                        {rows.map(([l, v, col]) => (
                          <div className="row" key={l}><span style={css('display: flex; gap: 8px; align-items: center;')}>{dot(col)}{l}</span><span className="num">{money(v)}</span></div>
                        ))}
                        <div className="row" style={css('border-bottom: 0; font-weight: 600;')}><span>Total cost</span><span className="num">{money(c.cost)}</span></div>
                      </section>
                      <section className="card" style={css('padding: 20px; display: flex; flex-direction: column; gap: 12px;')}>
                        <h3 style={css('margin: 0 0 2px; font-size: 15px; font-weight: 600;')}>Purchase vs resale</h3>
                        <div>
                          <div style={css('display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;')}><span style={css('color: var(--mfg);')}>Buy · {form.country}</span><span className="num">{money(price)}</span></div>
                          <div style={css('height: 8px; border-radius: 99px; background: var(--muted);')}><div style={{ width: `${(price / top) * 100}%`, height: '100%', borderRadius: 99, background: 'var(--c2)' }} /></div>
                        </div>
                        <div>
                          <div style={css('display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;')}><span style={css('color: var(--mfg);')}>Sell · Czechia</span><span className="num">{money(c.resale)}</span></div>
                          <div style={css('height: 8px; border-radius: 99px; background: var(--muted);')}><div style={{ width: `${(c.resale / top) * 100}%`, height: '100%', borderRadius: 99, background: 'var(--pos)' }} /></div>
                        </div>
                        <div className="row" style={css('margin-top: 4px;')}><span>Gross spread</span><span className="num">{money(c.resale - price)}</span></div>
                        <div className="row" style={css('border-bottom: 0;')}><span>Max purchase price</span><span className="num" style={css('font-weight: 600;')}>{money(res.maxPrice)}</span></div>
                        <p style={css('margin: 0; font-size: 12px; color: var(--mfg);')}>For a {settings.target}% target ROI. Change the target in Settings.</p>
                      </section>
                    </div>

                    <section className="card" style={css('padding: 20px 20px 8px;')}>
                      <h3 style={css('margin: 0 0 6px; font-size: 15px; font-weight: 600;')}>Scenarios</h3>
                      <div style={css('overflow-x: auto;')}>
                        <table>
                          <thead><tr><th scope="col"><span style={css('position: absolute; left: -9999px;')}>Metric</span></th><th scope="col">Conservative</th><th scope="col">Expected</th><th scope="col">Optimistic</th></tr></thead>
                          <tbody>
                            <tr><td>Resale value</td>{[res.conservative, e, res.optimistic].map((k, i) => <td key={i} className="num">{money(k.resale)}</td>)}</tr>
                            <tr><td>Repairs</td>{[res.conservative, e, res.optimistic].map((k, i) => <td key={i} className="num">{money(k.repairs)}</td>)}</tr>
                            <tr><td>Net profit</td>{[res.conservative, e, res.optimistic].map((k, i) => <td key={i} className="num" style={{ color: k.net >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>{money(k.net)}</td>)}</tr>
                            <tr><td style={{ borderBottom: 0 }}>ROI</td>{[res.conservative, e, res.optimistic].map((k, i) => <td key={i} className="num" style={{ borderBottom: 0 }}>{pct(k.roi)}</td>)}</tr>
                          </tbody>
                        </table>
                      </div>
                      <p style={css('margin: 8px 0 12px; font-size: 12px; color: var(--mfg);')}>Conservative: resale −6%, repairs +40%, 50% longer to sell. Optimistic: resale +4%, repairs −20%, 30% faster.</p>
                    </section>

                    <section className="card" style={css('padding: 20px;')}>
                      <h3 style={css('margin: 0 0 6px; font-size: 15px; font-weight: 600;')}>Risk assessment</h3>
                      {res.risk.map((r, i) => (
                        <div className="row" key={i} style={i === res.risk.length - 1 ? { borderBottom: 0 } : undefined}>
                          <span>{r.text}</span><span className={'badge ' + tone(r.level)}>{r.level === 'r' ? 'Risk' : r.level === 'a' ? 'Watch' : 'OK'}</span>
                        </div>
                      ))}
                    </section>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </AppFrame>
    </div>
  );
}
