// @ts-nocheck  (ported from the Design canvas artboard v2/Watchlist.dc.html; markup kept verbatim)
import React from 'react';
import './Watchlist.css';
import { css } from '../css';
import { V2Sidebar } from '../components/V2Sidebar';
import { useStore } from '../store';
import { api, photoSrc } from '../api';

function useVals(props: any) {
  const [st, setStRaw] = React.useState<any>({});
  const setSt = (p: any) => setStRaw((s: any) => ({ ...s, ...p }));
  const { watch, money, toggleWatch, setDraft, reload, user } = useStore();
    const cars = watch.map((w) => ({
      name: `${w.vehicle.make} ${w.vehicle.model}`, meta: `${w.vehicle.year} · ${w.vehicle.km.toLocaleString('en-US')} km · ${w.vehicle.country}`,
      net: Math.round(w.result.expected.net), roi: Math.round(w.result.expected.roi * 1000) / 10, score: w.result.score, risk: w.result.riskLevel.label,
      price: w.vehicle.price, max: Math.round(w.result.maxPrice), cons: Math.round(w.result.conservative.net), opt: Math.round(w.result.optimistic.net),
      photo: photoSrc(w.photo), upload: async (files) => { if (files && files.length) { try { await api.uploadPhotos(w.vehicle.id, Array.from(files)); await reload(); } catch (e) { alert(e.message || 'Could not upload the photo.'); } } }, analyze: () => setDraft(w.vehicle), remove: () => toggleWatch(w.vehicle),
    }));
    const eur = money;
    const defs = [
      ['Net profit', 'net', 1, (c) => eur(c.net)], ['ROI', 'roi', 1, (c) => c.roi + '%'], ['Deal score', 'score', 1, (c) => String(c.score)],
      ['Purchase price', 'price', 0, (c) => eur(c.price)], ['Max recommended price', 'max', 1, (c) => eur(c.max)], ['Risk', 'risk', 0, (c) => c.risk]
    ];
    const rows = defs.map(([label, k, hi, f]) => {
      const vals = cars.map((c) => c[k]);
      const best = cars.length && typeof vals[0] === 'number' ? (hi ? Math.max(...vals) : Math.min(...vals)) : null;
      return { label, cells: cars.map((c) => ({ v: f(c), st: '', cls: best !== null && c[k] === best ? 'best' : '' })) };
    });
    const lo = Math.min(0, ...cars.map((c) => c.cons)) - 300, hiV = Math.max(300, ...cars.map((c) => c.opt)) + 300, p = (v) => ((v - lo) / (hiV - lo) * 100);
    const spread = cars.map((c) => ({
      name: c.name, range: eur(c.cons) + ' → ' + eur(c.opt), l: p(c.cons).toFixed(1) + '%', w: (p(c.opt) - p(c.cons)).toFixed(1) + '%',
      c: p(c.net).toFixed(1) + '%', col: 'var(--pos)'
    }));
    const top = cars.length ? cars.reduce((x, y) => (y.net > x.net ? y : x)) : null;
    const lo2 = lo, hi2 = hiV;
    return { user, money, top, lo2, hi2, empty: cars.length === 0, rootClass: props.dark ? 'pg-watchlist dark' : 'pg-watchlist', cars, rows, spread, zero: p(0).toFixed(1) + '%' };
}

export default function WatchlistPage() {
  const V = useVals({});
  const { user, money, cars, rootClass, rows, spread, zero, top, lo2, hi2, empty } = V;
  return (
    <>
<div className={rootClass} style={css(`min-height: 100vh; display: flex; flex-wrap: wrap; align-items: stretch;`)}>
  <svg width="0" height="0" style={css(`position: absolute;`)} aria-hidden="true"><defs><linearGradient id="w1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b9bff"></stop><stop offset="1" stopColor="#1d4ed8"></stop></linearGradient></defs></svg>
  <V2Sidebar active="/app/watchlist" />

  <main style={css(`flex: 999 1 560px; min-width: 0; padding: 32px; box-sizing: border-box; display: flex; flex-direction: column; gap: 22px;`)}>
    <div style={css(`display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap;`)}>
      <div><h1 style={css(`margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.03em;`)}>Watchlist</h1><p style={css(`margin: 4px 0 0; color: var(--mfg);`)}>Compare saved opportunities. The best value in each row is highlighted.</p></div>
      <a className="btn btn-p" href="/app/deals"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>Add from Deal finder</a>
    </div>

    <section className="card" style={css(`overflow: hidden;`)}>
      <div style={css(`overflow-x: auto;`)}>
        <table>
          <thead><tr>
            <th scope="col"></th>
            {(cars).map((c, $index) => (<React.Fragment key={$index}><th scope="col" style={css(`vertical-align: top;`)}>{c.photo && <img src={c.photo} alt="" style={css(`width: 100%; max-width: 160px; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block; margin-left: auto;`)} />}<div style={css(`font-weight: 600;`)}>{c.name}</div>{user && <label style={css(`display: inline-block; margin: 4px 0 0; font-size: 12px; font-weight: 500; color: var(--blue); cursor: pointer;`)}><input type="file" accept="image/jpeg,image/png,image/webp" multiple style={css(`display: none;`)} onChange={(e) => c.upload(e.target.files)} />Add photos</label>}<div style={css(`font-size: 12px; color: var(--mfg); font-weight: 400;`)}>{c.meta}</div><div style={css(`margin-top: 6px; font-size: 12px; font-weight: 500;`)}><a href="/app/analyze" onClick={c.analyze} style={css(`color: var(--blue);`)}>Analyze</a> · <a href="#" onClick={(e) => { e.preventDefault(); c.remove(); }} style={css(`color: var(--neg);`)}>Remove</a></div></th></React.Fragment>))}
          </tr></thead>
          <tbody>
            {(rows).map((r, $index) => (<React.Fragment key={$index}>
              <tr><td>{r.label}</td>{(r.cells).map((x, $index) => (<React.Fragment key={$index}><td className="num" style={css(`${x.st}`)}><span className={x.cls} style={css(`display: inline-block; padding: 2px 8px; border-radius: 6px;`)}>{x.v}</span></td></React.Fragment>))}</tr>
            </React.Fragment>))}
          </tbody>
        </table>
      </div>
      {empty && <div style={css(`padding: 28px 18px; text-align: center; color: var(--mfg);`)}>Nothing saved yet. Add vehicles from the <a href="/app/deals" style={css(`color: var(--blue); font-weight: 500;`)}>Deal finder</a> or the analyzer.</div>}
    </section>

    <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 16px;`)}>
      <section className="card" style={css(`padding: 20px;`)}>
        <h2 style={css(`margin: 0; font-size: 15px; font-weight: 600;`)}>Profit across scenarios</h2>
        <p style={css(`margin: 2px 0 16px; font-size: 12.5px; color: var(--mfg);`)}>Conservative, expected and optimistic net profit per car.</p>
        <div style={css(`display: flex; flex-direction: column; gap: 16px;`)}>
          {(spread).map((s, $index) => (<React.Fragment key={$index}>
            <div>
              <div style={css(`display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;`)}><span style={css(`font-weight: 500;`)}>{s.name}</span><span className="num" style={css(`color: var(--mfg);`)}>{s.range}</span></div>
              <div style={css(`position: relative; height: 14px;`)}>
                <div aria-hidden="true" style={css(`position: absolute; left: 0; right: 0; top: 6px; height: 2px; background: var(--muted);`)}></div>
                <div aria-hidden="true" style={css(`position: absolute; top: 0; bottom: 0; left: ${zero}; border-left: 1px dashed var(--mfg);`)}></div>
                <div style={css(`position: absolute; top: 3px; height: 8px; border-radius: 99px; left: ${s.l}; width: ${s.w}; background: var(--blue); opacity: .25;`)}></div>
                <div style={css(`position: absolute; top: 0; width: 14px; height: 14px; margin-left: -7px; border-radius: 99px; left: ${s.c}; background: ${s.col}; border: 3px solid var(--card); box-sizing: content-box; transform: translate(-3px, -3px);`)}></div>
              </div>
            </div>
          </React.Fragment>))}
        </div>
        <div className="num" style={css(`display: flex; justify-content: space-between; font-size: 11px; color: var(--mfg); margin-top: 14px;`)}><span>{money(lo2)}</span><span>{money(0)}</span><span>{money(hi2)}</span></div>
      </section>
      <section className="card" style={css(`padding: 20px; display: flex; flex-direction: column; gap: 10px;`)}>
        <h2 style={css(`margin: 0; font-size: 15px; font-weight: 600;`)}>Verdict</h2>
        <p style={css(`margin: 0; color: var(--mfg);`)}>{top ? `${top.name} leads on expected profit (${money(top.net)}). Compare the maximum recommended price in each column before you make an offer.` : 'Save a few vehicles to compare them side by side.'}</p>
        <div style={css(`margin-top: auto; padding: 12px; border-radius: 10px; background: var(--pos-bg); color: var(--pos); font-weight: 600; font-size: 13px;`)}>{top ? `Best pick: ${top.name}` : 'No saved vehicles yet'}</div>
      </section>
    </div>
  </main>
</div>
    </>
  );
}
