// @ts-nocheck  (ported from the Design canvas artboard v2/Landing.dc.html; markup kept verbatim)
import React from 'react';
import './Landing.css';
import { css } from '../css';
import HeroCarousel from '../components/HeroCarousel';

function useVals(props: any) {
  const [st, setStRaw] = React.useState<any>({});
  const setSt = (p: any) => setStRaw((s: any) => ({ ...s, ...p }));
  const mk = [['Germany', 21400], ['Poland', 21800], ['Austria', 22900], ['Netherlands', 23100], ['Slovakia', 23300], ['Czechia', 23500]];
    const markets = mk.map(([c, p], i) => ({
      c, p: '€' + p.toLocaleString('en-US'), w: (40 + (p - 21000) / 2500 * 60).toFixed(1) + '%',
      bg: i === 0 ? 'var(--pos)' : i === mk.length - 1 ? 'var(--blue)' : 'oklch(0.75 0 0)'
    }));
    return { rootClass: props.dark ? 'pg-landing dark' : 'pg-landing', markets };
}

export default function LandingPage() {
  const V = useVals({});
  const { markets, rootClass } = V;
  return (
    <>
<div className={rootClass} style={css(`min-height: 100vh;`)}>
  <svg width="0" height="0" style={css(`position: absolute;`)} aria-hidden="true"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b9bff"></stop><stop offset="1" stopColor="#1d4ed8"></stop></linearGradient><linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity=".22"></stop><stop offset="1" stopColor="#2563eb" stopOpacity="0"></stop></linearGradient></defs></svg>

  <header style={css(`position: sticky; top: 0; z-index: 5; background: color-mix(in oklab, var(--bg) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border);`)}>
    <div style={css(`max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 16px;`)}>
      <a href="/" aria-label="FlipPilot home" style={css(`display: flex; align-items: center; gap: 10px;`)}>
        <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4.5 41 14.25v19.5L24 43.5 7 33.75v-19.5z" fill="url(#lg1)" stroke="url(#lg1)" strokeWidth="3" strokeLinejoin="round"></path><path d="M26.5 10 15.5 26.2h7.6L20.8 38 32.5 21.4h-7.8z" fill="#fff"></path></svg>
        <span style={css(`font-weight: 700; font-size: 19px; letter-spacing: -0.03em;`)}>FlipPilot</span>
      </a>
      <nav className="hide-sm" style={css(`display: flex; gap: 2px;`)} aria-label="Main"><a className="nl" href="#how">How it works</a><a className="nl" href="#features">Features</a><a className="nl" href="#markets">Markets</a><a className="nl" href="#pricing">Pricing</a></nav>
      <div style={css(`display: flex; gap: 8px;`)}><a className="btn btn-g" href="/login">Sign in</a><a className="btn btn-p" href="/app">Start free</a></div>
    </div>
  </header>

  <section style={css(`position: relative; overflow: hidden; border-bottom: 1px solid var(--border);`)}>
    <div aria-hidden="true" style={css(`position: absolute; inset: 0; background: radial-gradient(60% 50% at 80% 0%, color-mix(in oklab, var(--blue) 12%, transparent), transparent 70%), radial-gradient(oklch(0.9 0 0 / 0.9) 1px, transparent 1px); background-size: auto, 24px 24px; -webkit-mask-image: linear-gradient(#000 60%, transparent); mask-image: linear-gradient(#000 60%, transparent);`)}></div>
    <div style={css(`position: relative; max-width: 1200px; margin: 0 auto; padding: 80px 24px 88px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap: 56px; align-items: center;`)}>
      <div style={css(`display: flex; flex-direction: column; gap: 24px; align-items: flex-start;`)}>
        <span className="badge"><span style={css(`width: 6px; height: 6px; border-radius: 99px; background: var(--pos);`)}></span>Germany → Czechia margin calculator</span>
        <h1 className="hero" style={css(`margin: 0; font-size: 62px; line-height: 1.01; font-weight: 800; letter-spacing: -0.045em; max-width: 12ch;`)}>Know your margin <span style={css(`color: var(--blue);`)}>before</span> you make the offer.</h1>
        <p style={css(`margin: 0; font-size: 18px; line-height: 1.6; color: var(--mfg); max-width: 520px;`)}>Turn a German listing into a Czech resale forecast: transport, registration, repairs, three scenarios and the highest price you can pay and still profit.</p>
        <div style={css(`display: flex; gap: 12px; flex-wrap: wrap;`)}><a className="btn btn-p btn-lg" href="/app/analyze">Analyze a vehicle<svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a><a className="btn btn-o btn-lg" href="/app/deals">Browse demo deals</a></div>
        <div style={css(`display: flex; gap: 24px; flex-wrap: wrap; color: var(--mfg); font-size: 13px;`)}><span style={css(`display: flex; gap: 6px; align-items: center;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos);`)}><path d="M20 6 9 17l-5-5"></path></svg>No sign-up needed</span><span style={css(`display: flex; gap: 6px; align-items: center;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos);`)}><path d="M20 6 9 17l-5-5"></path></svg>Demo data, fictional</span></div>
      </div>

      <HeroCarousel />
    </div>
  </section>

  <section style={css(`border-bottom: 1px solid var(--border); background: var(--muted);`)}>
    <div style={css(`max-width: 1200px; margin: 0 auto; padding: 28px 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 24px; text-align: center;`)}>
      <div><div className="num" style={css(`font-size: 26px; font-weight: 600;`)}>3</div><div style={css(`color: var(--mfg); font-size: 13px;`)}>scenarios per deal</div></div>
      <div><div className="num" style={css(`font-size: 26px; font-weight: 600;`)}>6</div><div style={css(`color: var(--mfg); font-size: 13px;`)}>cost lines included</div></div>
      <div><div className="num" style={css(`font-size: 26px; font-weight: 600;`)}>0–100</div><div style={css(`color: var(--mfg); font-size: 13px;`)}>deal score</div></div>
      <div><div className="num" style={css(`font-size: 26px; font-weight: 600;`)}>&lt; 1 min</div><div style={css(`color: var(--mfg); font-size: 13px;`)}>from listing to offer</div></div>
    </div>
  </section>

  <section id="how" style={css(`border-bottom: 1px solid var(--border);`)}>
    <div style={css(`max-width: 1200px; margin: 0 auto; padding: 88px 24px; display: flex; flex-direction: column; gap: 44px;`)}>
      <div style={css(`display: flex; flex-direction: column; gap: 10px; max-width: 640px;`)}><span className="eyebrow">How it works</span><h2 className="sec">From listing to offer in under a minute</h2></div>
      <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;`)}>
        <div className="card" style={css(`padding: 24px; display: flex; flex-direction: column; gap: 12px;`)}><span className="num" style={css(`color: var(--blue); font-weight: 600;`)}>01</span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;`)}>Enter the listing</h3><p style={css(`margin: 0; color: var(--mfg);`)}>Make, model, year, mileage, condition and asking price from mobile.de or any marketplace.</p>
          <div style={css(`margin-top: 6px; border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px;`)}><div style={css(`height: 8px; width: 70%; border-radius: 4px; background: var(--muted);`)}></div><div style={css(`height: 8px; width: 45%; border-radius: 4px; background: var(--muted);`)}></div><div className="num" style={css(`font-size: 13px;`)}>€17,900</div></div></div>
        <div className="card" style={css(`padding: 24px; display: flex; flex-direction: column; gap: 12px;`)}><span className="num" style={css(`color: var(--blue); font-weight: 600;`)}>02</span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;`)}>See the all-in cost</h3><p style={css(`margin: 0; color: var(--mfg);`)}>Transport, registration, repairs, holding and selling costs are added automatically.</p>
          <div style={css(`margin-top: 6px; display: flex; height: 36px; border-radius: 10px; overflow: hidden; gap: 2px;`)}><i style={css(`flex: 87; background: var(--fg);`)}></i><i style={css(`flex: 2; background: #2563eb;`)}></i><i style={css(`flex: 2; background: #6366f1;`)}></i><i style={css(`flex: 4; background: #f59e0b;`)}></i><i style={css(`flex: 2; background: #94a3b8;`)}></i><i style={css(`flex: 3; background: #cbd5e1;`)}></i></div></div>
        <div className="card" style={css(`padding: 24px; display: flex; flex-direction: column; gap: 12px;`)}><span className="num" style={css(`color: var(--blue); font-weight: 600;`)}>03</span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;`)}>Make the right offer</h3><p style={css(`margin: 0; color: var(--mfg);`)}>Get a deal score, three scenarios and the maximum price that still hits your target ROI.</p>
          <div style={css(`margin-top: 6px; border-radius: 10px; background: var(--pos-bg); color: var(--pos); padding: 12px; font-size: 13px; font-weight: 600;`)}>Max price <span className="num">€16,527</span></div></div>
      </div>
    </div>
  </section>

  <section id="features" style={css(`border-bottom: 1px solid var(--border); background: var(--muted);`)}>
    <div style={css(`max-width: 1200px; margin: 0 auto; padding: 88px 24px; display: flex; flex-direction: column; gap: 44px;`)}>
      <div style={css(`display: flex; flex-direction: column; gap: 10px; max-width: 640px;`)}><span className="eyebrow">Features</span><h2 className="sec">Built for the border between two markets</h2></div>
      <div style={css(`display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px;`)}>
        <div className="card" style={css(`grid-column: span 4; padding: 24px; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; min-width: 0;`)}>
          <div style={css(`flex: 1 1 240px; display: flex; flex-direction: column; gap: 10px;`)}><span className="ico"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M8 6h8"></path><path d="M16 14v4"></path><path d="M8 10h.01"></path><path d="M12 10h.01"></path><path d="M16 10h.01"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path></svg></span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600;`)}>Three scenarios, side by side</h3><p style={css(`margin: 0; color: var(--mfg);`)}>Conservative, expected and optimistic profit, so a bad month never surprises you.</p></div>
          <div style={css(`flex: 1 1 260px; display: flex; flex-direction: column; gap: 10px;`)}>
            <div style={css(`display: grid; grid-template-columns: 90px 1fr 56px; gap: 10px; align-items: center; font-size: 12px;`)}><span style={css(`color: var(--mfg);`)}>Conservative</span><span style={css(`height: 8px; border-radius: 99px; background: var(--muted);`)}><i style={css(`display: block; height: 100%; width: 12%; border-radius: 99px; background: var(--neg);`)}></i></span><span className="num" style={css(`color: var(--neg);`)}>−€835</span></div>
            <div style={css(`display: grid; grid-template-columns: 90px 1fr 56px; gap: 10px; align-items: center; font-size: 12px;`)}><span style={css(`color: var(--mfg);`)}>Expected</span><span style={css(`height: 8px; border-radius: 99px; background: var(--muted);`)}><i style={css(`display: block; height: 100%; width: 45%; border-radius: 99px; background: var(--blue);`)}></i></span><span className="num">€920</span></div>
            <div style={css(`display: grid; grid-template-columns: 90px 1fr 56px; gap: 10px; align-items: center; font-size: 12px;`)}><span style={css(`color: var(--mfg);`)}>Optimistic</span><span style={css(`height: 8px; border-radius: 99px; background: var(--muted);`)}><i style={css(`display: block; height: 100%; width: 100%; border-radius: 99px; background: var(--pos);`)}></i></span><span className="num" style={css(`color: var(--pos);`)}>€2,025</span></div>
          </div>
        </div>
        <div className="card" style={css(`grid-column: span 2; padding: 24px; display: flex; flex-direction: column; gap: 10px; min-width: 0;`)}><span className="ico"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 14 4-4"></path><path d="M3.34 19a10 10 0 1 1 17.32 0"></path></svg></span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600;`)}>Deal score</h3><p style={css(`margin: 0; color: var(--mfg);`)}>One number from 0 to 100 that weighs ROI, downside and risk.</p></div>
        <div className="card" style={css(`grid-column: span 2; padding: 24px; display: flex; flex-direction: column; gap: 10px; min-width: 0;`)}><span className="ico"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle></svg></span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600;`)}>Cross-border costs</h3><p style={css(`margin: 0; color: var(--mfg);`)}>Transport, export, registration and homologation in every calculation.</p></div>
        <div className="card" style={css(`grid-column: span 2; padding: 24px; display: flex; flex-direction: column; gap: 10px; min-width: 0;`)}><span className="ico"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg></span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600;`)}>Repair estimates</h3><p style={css(`margin: 0; color: var(--mfg);`)}>From condition, mileage and age, or your own budget.</p></div>
        <div className="card" style={css(`grid-column: span 2; padding: 24px; display: flex; flex-direction: column; gap: 10px; min-width: 0;`)}><span className="ico"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600;`)}>Maximum price</h3><p style={css(`margin: 0; color: var(--mfg);`)}>The most you can pay and still hit your target ROI.</p></div>
        <div className="card" style={css(`grid-column: span 2; padding: 24px; display: flex; flex-direction: column; gap: 10px; min-width: 0;`)}><span className="ico"><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"></path><path d="M12 3v9h9"></path></svg></span><h3 style={css(`margin: 0; font-size: 18px; font-weight: 600;`)}>Budget &amp; risk manager</h3><p style={css(`margin: 0; color: var(--mfg);`)}>Set capital, profit targets and downside limits. Every listing is screened.</p></div>
      </div>
    </div>
  </section>

  <section id="markets" style={css(`border-bottom: 1px solid var(--border);`)}>
    <div style={css(`max-width: 1200px; margin: 0 auto; padding: 88px 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 56px; align-items: center;`)}>
      <div style={css(`display: flex; flex-direction: column; gap: 14px;`)}><span className="eyebrow">Market comparison</span><h2 className="sec">Same car, six markets</h2><p style={css(`margin: 0; color: var(--mfg); font-size: 16px; max-width: 460px;`)}>See where a model sells for the most, and what the gap leaves after transport and registration.</p><a className="btn btn-o" href="/app/market" style={css(`align-self: flex-start;`)}>Open market intelligence<svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a></div>
      <div className="card" style={css(`padding: 24px; display: flex; flex-direction: column; gap: 12px;`)}>
        <div style={css(`font-weight: 600;`)}>VW Golf 8 2.0 TDI, 2021</div>
        {(markets).map((m, $index) => (<React.Fragment key={$index}><div style={css(`display: grid; grid-template-columns: 96px 1fr 64px; gap: 10px; align-items: center; font-size: 13px;`)}><span style={css(`color: var(--mfg);`)}>{m.c}</span><span style={css(`height: 10px; border-radius: 99px; background: var(--muted); display: block; overflow: hidden;`)}><span style={css(`display: block; height: 100%; border-radius: 99px; width: ${m.w}; background: ${m.bg};`)}></span></span><span className="num" style={css(`text-align: right;`)}>{m.p}</span></div></React.Fragment>))}
      </div>
    </div>
  </section>

  <section id="pricing" style={css(`border-bottom: 1px solid var(--border); background: var(--muted);`)}>
    <div style={css(`max-width: 1200px; margin: 0 auto; padding: 88px 24px; display: flex; flex-direction: column; gap: 44px;`)}>
      <div style={css(`display: flex; flex-direction: column; gap: 10px; align-items: center; text-align: center;`)}><span className="eyebrow">Pricing</span><h2 className="sec">Start with Scout, upgrade when you trade</h2><p style={css(`margin: 0; color: var(--mfg);`)}>Preview only. Billing isn’t enabled yet.</p></div>
      <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;`)}>
        <div className="card" style={css(`padding: 28px; display: flex; flex-direction: column; gap: 20px;`)}><div><h3 style={css(`margin: 0; font-size: 16px; font-weight: 600;`)}>Scout</h3><p style={css(`margin: 4px 0 0; color: var(--mfg);`)}>Try it on your next listing.</p></div><div><span className="num" style={css(`font-size: 42px; font-weight: 600; letter-spacing: -0.04em;`)}>€5</span><span style={css(`color: var(--mfg);`)}> /month</span></div><div style={css(`display: flex; flex-direction: column; gap: 10px; flex: 1;`)}><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>10 analyses per month</div><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>Deal score and scenarios</div></div><a className="btn btn-o" href="/app">Choose Scout</a></div>
        <div className="card" style={css(`padding: 27px; border: 2px solid var(--blue); display: flex; flex-direction: column; gap: 20px; position: relative; box-shadow: 0 24px 48px -28px rgba(37,99,235,.45);`)}><span className="badge" style={css(`position: absolute; top: -13px; left: 26px; background: var(--blue); color: #fff; border-color: var(--blue);`)}>Most popular</span><div><h3 style={css(`margin: 0; font-size: 16px; font-weight: 600;`)}>Trader</h3><p style={css(`margin: 4px 0 0; color: var(--mfg);`)}>For regular cross-border flips.</p></div><div><span className="num" style={css(`font-size: 42px; font-weight: 600; letter-spacing: -0.04em;`)}>€49</span><span style={css(`color: var(--mfg);`)}> /month</span></div><div style={css(`display: flex; flex-direction: column; gap: 10px; flex: 1;`)}><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>Unlimited analyses</div><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>Watchlist and comparison</div><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>Budget and risk manager</div></div><a className="btn btn-p" href="/app">Choose Trader</a></div>
        <div className="card" style={css(`padding: 28px; display: flex; flex-direction: column; gap: 20px;`)}><div><h3 style={css(`margin: 0; font-size: 16px; font-weight: 600;`)}>Dealership</h3><p style={css(`margin: 4px 0 0; color: var(--mfg);`)}>For teams buying at volume.</p></div><div><span className="num" style={css(`font-size: 42px; font-weight: 600; letter-spacing: -0.04em;`)}>€149</span><span style={css(`color: var(--mfg);`)}> /month</span></div><div style={css(`display: flex; flex-direction: column; gap: 10px; flex: 1;`)}><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>Team seats</div><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>Shared watchlists</div><div style={css(`display: flex; gap: 10px;`)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={css(`color: var(--pos); margin-top: 3px;`)}><path d="M20 6 9 17l-5-5"></path></svg>API access</div></div><a className="btn btn-o" href="/app">Contact sales</a></div>
      </div>
    </div>
  </section>

  <section style={css(`padding: 72px 24px; text-align: center;`)}>
    <div style={css(`max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; align-items: center;`)}>
      <h2 className="sec">Check your next deal before you call the seller</h2>
      <a className="btn btn-p btn-lg" href="/app/analyze">Analyze a vehicle<svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a>
    </div>
  </section>

  <footer style={css(`border-top: 1px solid var(--border);`)}><div style={css(`max-width: 1200px; margin: 0 auto; padding: 28px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; color: var(--mfg); font-size: 13px;`)}><span style={css(`display: flex; align-items: center; gap: 8px; color: var(--fg); font-weight: 600;`)}><svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4.5 41 14.25v19.5L24 43.5 7 33.75v-19.5z" fill="url(#lg1)" stroke="url(#lg1)" strokeWidth="3" strokeLinejoin="round"></path><path d="M26.5 10 15.5 26.2h7.6L20.8 38 32.5 21.4h-7.8z" fill="#fff"></path></svg>FlipPilot</span><span>Demo listings and reference prices are fictional, not live marketplace data.</span></div></footer>
</div>
    </>
  );
}
