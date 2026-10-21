import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { api, Result, Vehicle } from '../api';
import { Donut, Gauge, PriceLine } from '../charts';
import { levelKey, pct } from '../format';
import { useLayout } from '../layout';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Badge, Btn, Card, Field, Row, Segmented, Txt } from '../ui';
import { Screen } from './Screen';

const CONDS = ['Excellent', 'Good', 'Fair', 'Poor'] as const;
const COUNTRIES = ['DE', 'AT', 'NL', 'BE', 'PL'] as const;
const SCEN = ['Conservative', 'Expected', 'Optimistic'] as const;

type Form = Record<'make' | 'model' | 'year' | 'km' | 'price' | 'resale' | 'transport' | 'repairs' | 'days' | 'desc', string> & { cond: Vehicle['cond']; country: string };

const toForm = (v: Vehicle): Form => ({
  make: v.make, model: v.model, year: String(v.year), km: String(v.km), price: String(v.price), resale: v.resale ? String(v.resale) : '',
  transport: v.transport == null ? '' : String(v.transport), repairs: v.repairs == null ? '' : String(v.repairs), days: String(v.days), desc: v.desc,
  cond: v.cond, country: v.country,
});
const num = (s: string) => { const n = parseFloat(s.replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const toVehicle = (f: Form, base: Vehicle): Vehicle => ({
  ...base, make: f.make, model: f.model, year: num(f.year), km: num(f.km), price: num(f.price), resale: num(f.resale),
  transport: f.transport === '' ? null : num(f.transport), repairs: f.repairs === '' ? null : num(f.repairs),
  days: num(f.days) || 45, desc: f.desc, cond: f.cond, country: f.country,
});

export function AnalyzeScreen() {
  const { theme } = useTheme();
  const { desktop } = useLayout();
  const { items, draft, setDraft, money, settings, watch, toggleWatch, saveAnalysis } = useStore();
  const base = useMemo(() => items[0]?.vehicle, [items]);
  const [form, setForm] = useState<Form | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [scen, setScen] = useState<(typeof SCEN)[number]>('Expected');
  const [note, setNote] = useState('');

  useEffect(() => { if (!form && base) { setVehicle(base); setForm(toForm(base)); } }, [base, form]);
  useEffect(() => { if (draft) { setVehicle(draft); setForm(toForm(draft)); setDraft(null); setNote(''); } }, [draft, setDraft]);

  useEffect(() => {
    if (!form || !vehicle) return;
    const v = toVehicle(form, vehicle);
    if (!(v.price > 0)) { setRes(null); return; }
    let live = true;
    const t = setTimeout(() => { api.analyze(v).then((r) => live && setRes(r)).catch(() => live && setRes(null)); }, 180);
    return () => { live = false; clearTimeout(t); };
  }, [form, vehicle, settings]);

  if (!form || !vehicle) return <Screen><View /></Screen>;
  const set = (k: keyof Form) => (t: string) => setForm({ ...form, [k]: t });
  const c = res && (scen === 'Conservative' ? res.conservative : scen === 'Optimistic' ? res.optimistic : res.expected);
  const price = num(form.price);
  const watched = watch.includes(vehicle.id);

  return (
    <Screen sub="Enter the specs; every number updates as you type.">
      <View style={{ flexDirection: desktop ? 'row-reverse' : 'column', gap: 14, alignItems: 'flex-start' }}>
      <View style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%', gap: 14 }}>
      {res && c ? (
        <>
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Gauge score={res.score} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={12} muted>Net profit · {scen.toLowerCase()}</Txt>
                <Txt size={32} mono w="semibold" color={c.net >= 0 ? theme.pos : theme.neg} style={{ letterSpacing: -1.2 }}>{money(c.net)}</Txt>
                <Txt size={12} muted>{pct(c.roi)} ROI · all-in {money(c.cost)}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Badge label={res.verdict.label} tone={levelKey(res.verdict.level) === 'pos' ? 'pos' : levelKey(res.verdict.level)} />
              <Badge label={`Risk: ${res.riskLevel.label}`} tone={levelKey(res.riskLevel.level)} />
            </View>
            <Segmented value={scen} options={SCEN} onChange={setScen} />
          </Card>

          <Card style={{ gap: 10 }}>
            <Txt w="semibold">Where the money goes</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Donut
                center={money(c.cost)} sub="all-in"
                segments={[
                  { v: price, c: theme.chart[0] }, { v: res.transport, c: theme.chart[1] }, { v: res.registration, c: theme.chart[2] },
                  { v: c.repairs, c: theme.chart[3] }, { v: c.hold, c: theme.chart[4] }, { v: c.fees, c: theme.chart[5] },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Row label="Purchase" value={money(price)} />
                <Row label={`Transport ${form.country} → CZ`} value={money(res.transport)} />
                <Row label="Registration" value={money(res.registration)} />
                <Row label="Repairs" value={money(c.repairs)} />
                <Row label={`Holding, ${res.days} d`} value={money(c.hold)} />
                <Row label="Fees & selling" value={money(c.fees)} last />
              </View>
            </View>
          </Card>

          <Card style={{ gap: 10 }}>
            <Txt w="semibold">What should I offer?</Txt>
            <PriceLine asking={price} target={Math.max(0, res.maxPrice)} breakEven={price + res.expected.net} from={Math.max(0, res.maxPrice - 2500)} to={price + res.expected.net + 1500} />
            {price > res.maxPrice ? (
              <View style={{ backgroundColor: theme.warnBg, borderRadius: 10, padding: 12 }}>
                <Txt size={13}>Max price for a {settings.target}% ROI is <Txt size={13} mono w="semibold">{money(res.maxPrice)}</Txt>. Asking is <Txt size={13} mono w="semibold">{money(price - res.maxPrice)}</Txt> above it: negotiate or pass.</Txt>
              </View>
            ) : (
              <View style={{ backgroundColor: theme.posBg, borderRadius: 10, padding: 12 }}>
                <Txt size={13}>Max price is <Txt size={13} mono w="semibold">{money(res.maxPrice)}</Txt>. The asking price leaves <Txt size={13} mono w="semibold">{money(res.maxPrice - price)}</Txt> of headroom.</Txt>
              </View>
            )}
          </Card>

          <Card>
            <Txt w="semibold" style={{ marginBottom: 4 }}>Scenarios</Txt>
            {([['Conservative', res.conservative], ['Expected', res.expected], ['Optimistic', res.optimistic]] as const).map(([n, k], i) => (
              <Row key={n} label={`${n} · ${pct(k.roi)}`} value={money(k.net)} bold={n === 'Expected'} last={i === 2} color={k.net >= 0 ? theme.pos : theme.neg} />
            ))}
            <Txt size={11} muted style={{ marginTop: 8 }}>Conservative: resale −6%, repairs +40%, 50% longer to sell. Optimistic: resale +4%, repairs −20%, 30% faster.</Txt>
          </Card>

          <Card style={{ gap: 6 }}>
            <Txt w="semibold">Risk assessment</Txt>
            {res.risk.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 }}>
                <Badge label={r.level === 'r' ? 'Risk' : r.level === 'a' ? 'Watch' : 'OK'} tone={levelKey(r.level)} />
                <Txt size={13} style={{ flex: 1 }}>{r.text}</Txt>
              </View>
            ))}
          </Card>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn flex label="Save analysis" onPress={() => { void saveAnalysis(toVehicle(form, vehicle)); setNote('Analysis saved'); }} />
            <Btn flex variant="outline" label={watched ? 'On watchlist' : 'Add to watchlist'} onPress={() => void toggleWatch(vehicle.id)} />
          </View>
          {note ? <Txt size={12} color={theme.pos} align="center">{note}</Txt> : null}
        </>
      ) : (
        <Card><Txt size={13} muted>Enter a purchase price to see the analysis.</Txt></Card>
      )}
      </View>

      <Card style={{ gap: 14, width: desktop ? 400 : '100%' }}>
        <Txt w="semibold">Vehicle details</Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}><Field label="Make" value={form.make} onChangeText={set('make')} /><Field label="Model" value={form.model} onChangeText={set('model')} /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Year" value={form.year} onChangeText={set('year')} /><Field numeric label="Mileage (km)" value={form.km} onChangeText={set('km')} /></View>
        <View style={{ gap: 6 }}><Txt size={13} w="medium">Condition</Txt><Segmented value={form.cond} options={CONDS} onChange={(v) => setForm({ ...form, cond: v })} /></View>
        <View style={{ gap: 6 }}><Txt size={13} w="medium">Purchase country</Txt><Segmented value={form.country as (typeof COUNTRIES)[number]} options={COUNTRIES} onChange={(v) => setForm({ ...form, country: v })} /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Purchase price (€)" value={form.price} onChangeText={set('price')} /><Field numeric label="Resale in CZ (€)" value={form.resale} onChangeText={set('resale')} placeholder="Estimate" /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Transport (€)" value={form.transport} onChangeText={set('transport')} placeholder="Default" /><Field numeric label="Repairs (€)" value={form.repairs} onChangeText={set('repairs')} placeholder="Auto" /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Days to sell" value={form.days} onChangeText={set('days')} /><Field label="Description" value={form.desc} onChangeText={set('desc')} hint="Words like “Unfall” or “export” raise risk." /></View>
      </Card>
      </View>
    </Screen>
  );
}
