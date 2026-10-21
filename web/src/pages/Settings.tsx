import React, { useEffect, useState } from 'react';
import { ApiError, Settings } from '../api';
import { V2Sidebar } from '../components/V2Sidebar';
import { css } from '../css';
import { useStore } from '../store';
import './Settings.css';

const num = (s: string) => { const v = parseFloat(s.replace(',', '.')); return Number.isFinite(v) ? v : NaN; };

export default function SettingsPage() {
  const { settings, updateSettings, user } = useStore();
  const lock = !user;
  const [f, setF] = useState<Record<string, string>>({});
  const [cur, setCur] = useState<Settings['cur']>('EUR');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setF({ name: settings.name, target: String(settings.target), reg: String(settings.reg), fees: String(settings.fees), day: String(settings.day), fxCZK: String(settings.fxCZK), fxPLN: String(settings.fxPLN) });
    setCur(settings.cur);
  }, [settings]);
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    const next: Settings = { ...settings, name: f.name ?? '', cur, target: num(f.target), reg: num(f.reg), fees: num(f.fees), day: num(f.day), fxCZK: num(f.fxCZK), fxPLN: num(f.fxPLN) };
    if (![next.target, next.reg, next.fees, next.day, next.fxCZK, next.fxPLN].every(Number.isFinite)) return setMsg({ ok: false, text: 'Enter valid numbers in every field.' });
    try {
      await updateSettings(next);
      setMsg({ ok: true, text: 'Saved. Changes apply to the next calculation.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? [e.message, ...e.details].join(' ') : 'Could not save.' });
    }
  };

  return (
    <div className="pg-settings" style={css('min-height: 100vh; display: flex; flex-wrap: wrap; align-items: stretch;')}>
      <V2Sidebar active="/app/settings" />
      <main style={css('flex: 999 1 560px; min-width: 0; padding: 32px; box-sizing: border-box; display: flex; flex-direction: column; gap: 22px; max-width: 980px;')}>
        <div><h1 style={css('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.03em;')}>Settings</h1><p style={css('margin: 4px 0 0; color: var(--mfg);')}>Profile and calculator defaults. Changes apply on the next calculation.</p></div>
        {lock && (
          <div role="note" style={css('padding: 12px 16px; border-radius: 10px; background: var(--card); border: 1px solid var(--border); font-size: 13px;')}>
            You’re browsing as a guest. The display currency is saved in this browser; <a href="/login" style={css('color: var(--blue); font-weight: 500;')}>sign in</a> to change the calculator defaults and keep them on the server.
          </div>
        )}

        <section className="card" style={css('padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;')}>
          <div style={css('grid-column: 1 / -1;')}><h2 style={css('margin: 0; font-size: 16px; font-weight: 600;')}>Profile</h2><p className="hint" style={css('margin-top: 2px;')}>{user ? 'Your settings are stored on the FlipPilot server.' : 'Guest profile.'}</p></div>
          <div><label htmlFor="n">Display name</label><input id="n" disabled={lock} value={f.name ?? ''} onChange={on('name')} /></div>
          <div><label htmlFor="e">Email</label><input id="e" value={user?.email ?? ''} disabled /></div>
        </section>

        <section className="card" style={css('padding: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;')}>
          <div style={css('grid-column: 1 / -1;')}><h2 style={css('margin: 0; font-size: 16px; font-weight: 600;')}>Calculator defaults</h2><p className="hint" style={css('margin-top: 2px;')}>Used for every analysis. The engine stores EUR internally.</p></div>
          <div><label htmlFor="c">Display currency</label><select id="c" value={cur} onChange={(e) => setCur(e.target.value as Settings['cur'])}><option value="EUR">EUR €</option><option value="CZK">CZK Kč</option><option value="PLN">PLN zł</option></select></div>
          <div><label htmlFor="t">Target ROI (%)</label><input id="t" disabled={lock} className="num" inputMode="decimal" value={f.target ?? ''} onChange={on('target')} /><p className="hint">Sets the maximum recommended price.</p></div>
          <div><label htmlFor="r">Registration &amp; homologation (€)</label><input id="r" disabled={lock} className="num" inputMode="decimal" value={f.reg ?? ''} onChange={on('reg')} /></div>
          <div><label htmlFor="f">Fixed fees per deal (€)</label><input id="f" disabled={lock} className="num" inputMode="decimal" value={f.fees ?? ''} onChange={on('fees')} /></div>
          <div><label htmlFor="h">Holding cost (€/day)</label><input id="h" disabled={lock} className="num" inputMode="decimal" value={f.day ?? ''} onChange={on('day')} /></div>
          <div><label htmlFor="x1">CZK per €1</label><input id="x1" disabled={lock} className="num" inputMode="decimal" value={f.fxCZK ?? ''} onChange={on('fxCZK')} /></div>
          <div><label htmlFor="x2">PLN per €1</label><input id="x2" disabled={lock} className="num" inputMode="decimal" value={f.fxPLN ?? ''} onChange={on('fxPLN')} /></div>
          <p className="hint" style={css('grid-column: 1 / -1; margin: 0;')}>Currencies use fixed illustrative rates, not live ones.</p>
        </section>

        <div style={css('display: flex; gap: 12px; align-items: center; flex-wrap: wrap;')}>
          <button type="button" className="btn btn-p" onClick={() => void save()}>Save changes</button>
          {msg && <span role="status" style={{ fontSize: 13, color: msg.ok ? 'var(--pos)' : 'var(--neg)' }}>{msg.text}</span>}
        </div>
      </main>
    </div>
  );
}
