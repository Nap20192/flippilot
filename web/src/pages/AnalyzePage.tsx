import { CircleAlert, CircleCheck, Save, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { api, type Result, type Vehicle } from '@/api';
import { AnimatedNumber, Reveal } from '@/components/animated';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Donut, OfferChart, ScoreGauge } from '@/components/charts';
import { LevelBadge } from '@/components/level-badge';
import { SimpleSelect } from '@/components/simple-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { curSymbol, pct, rateOf, toDisplay } from '@/format';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

type Scen = 'conservative' | 'expected' | 'optimistic';
type Form = Record<'make' | 'model' | 'year' | 'km' | 'price' | 'resale' | 'transport' | 'repairs' | 'days' | 'desc' | 'url', string> & { engine: string; trans: string; cond: Vehicle['cond']; country: string };

const ENGINES = ['Diesel', 'Petrol', 'Hybrid', 'Electric'].map((v) => ({ value: v, label: v }));
const TRANS = ['Manual', 'Automatic'].map((v) => ({ value: v, label: v }));
const CONDS = ['Excellent', 'Good', 'Fair', 'Poor'].map((v) => ({ value: v as Vehicle['cond'], label: v }));
const COUNTRIES = [['DE', 'Germany (DE)'], ['AT', 'Austria (AT)'], ['NL', 'Netherlands (NL)'], ['BE', 'Belgium (BE)'], ['PL', 'Poland (PL)']].map(([value, label]) => ({ value, label }));

const toForm = (v: Vehicle, rate: number): Form => ({
  make: v.make, model: v.model, year: String(v.year), km: String(v.km), price: toDisplay(v.price, rate), resale: v.resale ? toDisplay(v.resale, rate) : '',
  transport: v.transport == null ? '' : toDisplay(v.transport, rate), repairs: v.repairs == null ? '' : toDisplay(v.repairs, rate), days: String(v.days),
  desc: v.desc, url: v.url ?? '', engine: v.engine, trans: v.trans, cond: v.cond, country: v.country,
});
const num = (s: string) => { const n = parseFloat(s.replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
const toVehicle = (f: Form, base: Vehicle, rate: number): Vehicle => ({
  ...base, make: f.make, model: f.model, year: num(f.year), km: num(f.km), price: num(f.price) / rate, resale: num(f.resale) / rate,
  transport: f.transport === '' ? null : num(f.transport) / rate, repairs: f.repairs === '' ? null : num(f.repairs) / rate,
  days: num(f.days) || 45, desc: f.desc, url: f.url, engine: f.engine, trans: f.trans, cond: f.cond, country: f.country,
});

function F({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

export default function AnalyzePage() {
  const { items, draft, setDraft, money, settings, isWatched, toggleWatch, saveAnalysis, ready } = useStore();
  const base = useMemo(() => items[0]?.vehicle, [items]);
  const [form, setForm] = useState<Form | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [scen, setScen] = useState<Scen>('expected');
  const rate = rateOf(settings);
  const sym = curSymbol(settings);
  const prevRate = useRef(rate);

  useEffect(() => { if (!form && !draft && base) { setVehicle(base); setForm(toForm(base, rate)); } }, [base, form, draft, rate]);
  useEffect(() => { if (draft) { setVehicle(draft); setForm(toForm(draft, rate)); setDraft(null); } }, [draft, setDraft, rate]);
  // switching currency re-expresses the typed amounts instead of leaving stale numbers
  useEffect(() => {
    if (prevRate.current === rate) return;
    const k = rate / prevRate.current;
    prevRate.current = rate;
    const conv = (x: string) => (x.trim() === '' ? '' : String(Math.round(num(x) * k * 100) / 100));
    setForm((f) => (f ? { ...f, price: conv(f.price), resale: conv(f.resale), transport: conv(f.transport), repairs: conv(f.repairs) } : f));
  }, [rate]);
  useEffect(() => {
    if (!form || !vehicle) return;
    const v = toVehicle(form, vehicle, rate);
    if (!(v.price > 0)) { setRes(null); return; }
    let live = true;
    const t = setTimeout(() => { api.analyze(v).then((r) => live && setRes(r)).catch(() => live && setRes(null)); }, 150);
    return () => { live = false; clearTimeout(t); };
  }, [form, vehicle, settings, rate]);

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => form && setForm({ ...form, [k]: e.target.value });
  const pick = <K extends keyof Form>(k: K) => (v: Form[K]) => form && setForm({ ...form, [k]: v });
  const watched = !!vehicle && isWatched(vehicle.id);
  const c = res?.[scen];
  const price = form ? num(form.price) / rate : 0;

  const costs = res && c && form ? [
    { name: 'Purchase price', value: price, color: 'var(--chart-1)' },
    { name: `Transport ${form.country} → CZ`, value: res.transport, color: 'var(--chart-2)' },
    { name: 'Registration', value: res.registration, color: 'var(--chart-5)' },
    { name: `Repairs${form.repairs === '' ? ' (auto)' : ''}`, value: c.repairs, color: 'var(--chart-3)' },
    { name: `Holding, ${res.days} days`, value: c.hold, color: 'var(--chart-4)' },
    { name: 'Fees & selling', value: c.fees, color: 'oklch(0.75 0.02 260)' },
  ] : [];

  const onSave = async () => { if (form && vehicle) { await saveAnalysis(toVehicle(form, vehicle, rate)); toast.success('Analysis saved'); } };
  const onWatch = async () => {
    if (!form || !vehicle) return;
    const was = watched;
    await toggleWatch(toVehicle(form, vehicle, rate));
    toast(was ? 'Removed from watchlist' : 'Added to watchlist', { icon: <Star className="size-4" /> });
  };

  return (
    <AppShell title="Analyze vehicle">
      <PageHeader title="Analyze vehicle" description="Enter specs and every number on the right updates live."
        actions={vehicle ? <>
          <Button variant="outline" onClick={() => void onWatch()}><Star data-icon="inline-start" className={cn(watched && 'fill-current')} />{watched ? 'On watchlist' : 'Add to watchlist'}</Button>
          <Button onClick={() => void onSave()}><Save data-icon="inline-start" />Save analysis</Button>
        </> : null} />

      {!ready || !form ? (
        <div className="grid gap-5 lg:grid-cols-[400px_1fr]"><div className="h-[640px] animate-pulse rounded-xl bg-muted" /><div className="h-[640px] animate-pulse rounded-xl bg-muted" /></div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="order-2 lg:order-1">
            <Reveal>
              <Card>
                <CardHeader><CardTitle>Vehicle details</CardTitle><CardDescription>Listing import isn’t connected yet. Enter the specs manually.</CardDescription></CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()} aria-label="Vehicle details">
                    <F id="url" label="Listing URL (optional)"><Input id="url" placeholder="https://www.mobile.de/…" value={form.url} onChange={set('url')} /></F>
                    <div className="grid grid-cols-2 gap-3">
                      <F id="make" label="Manufacturer"><Input id="make" value={form.make} onChange={set('make')} /></F>
                      <F id="model" label="Model"><Input id="model" value={form.model} onChange={set('model')} /></F>
                      <F id="year" label="Year"><Input id="year" className="num" inputMode="numeric" value={form.year} onChange={set('year')} /></F>
                      <F id="km" label="Mileage (km)"><Input id="km" className="num" inputMode="numeric" value={form.km} onChange={set('km')} /></F>
                      <F id="eng" label="Engine"><SimpleSelect id="eng" value={form.engine} options={ENGINES} onValueChange={pick('engine')} className="w-full" /></F>
                      <F id="tr" label="Transmission"><SimpleSelect id="tr" value={form.trans} options={TRANS} onValueChange={pick('trans')} className="w-full" /></F>
                      <F id="cond" label="Condition"><SimpleSelect id="cond" value={form.cond} options={CONDS} onValueChange={pick('cond')} className="w-full" /></F>
                      <F id="ctry" label="Purchase country"><SimpleSelect id="ctry" value={form.country} options={COUNTRIES} onValueChange={pick('country')} className="w-full" /></F>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <F id="price" label={`Purchase price (${sym})`}><Input id="price" className="num" inputMode="decimal" value={form.price} onChange={set('price')} /></F>
                      <F id="resale" label={`Expected resale in CZ (${sym})`}><Input id="resale" className="num" inputMode="decimal" placeholder="Estimate" value={form.resale} onChange={set('resale')} /></F>
                      <F id="tp" label={`Transport (${sym})`}><Input id="tp" className="num" inputMode="decimal" placeholder="Default by country" value={form.transport} onChange={set('transport')} /></F>
                      <F id="rep" label={`Repairs (${sym})`}><Input id="rep" className="num" inputMode="decimal" placeholder="Auto estimate" value={form.repairs} onChange={set('repairs')} /></F>
                      <F id="days" label="Days to sell"><Input id="days" className="num" inputMode="numeric" value={form.days} onChange={set('days')} /></F>
                    </div>
                    <F id="desc" label="Description">
                      <Textarea id="desc" rows={3} value={form.desc} onChange={set('desc')} />
                      <p className="text-xs text-muted-foreground">Warning terms like “Unfall”, “defekt” or “export” raise the risk score.</p>
                    </F>
                  </form>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
            {!res || !c ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Enter a purchase price to see the analysis.</CardContent></Card>
            ) : (
              <>
                <Reveal>
                  <Card>
                    <CardContent className="flex flex-col gap-5">
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex flex-col items-center gap-2"><ScoreGauge score={res.score} /><LevelBadge level={res.verdict.level}>{res.verdict.label}</LevelBadge></div>
                        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                          <span className="text-sm text-muted-foreground">Net profit · {scen}</span>
                          <AnimatedNumber value={c.net} format={money} duration={700} className={cn('num text-4xl font-semibold tracking-tight md:text-5xl', c.net >= 0 ? 'text-pos' : 'text-destructive')} />
                          <span className="text-sm text-muted-foreground"><span className="num">{pct(c.roi)}</span> ROI on <span className="num">{money(c.cost)}</span> all-in · Risk <LevelBadge level={res.riskLevel.level}>{res.riskLevel.label}</LevelBadge></span>
                        </div>
                      </div>
                      <Tabs value={scen} onValueChange={(v) => setScen(v as Scen)}>
                        <TabsList className="w-full"><TabsTrigger value="conservative">Conservative</TabsTrigger><TabsTrigger value="expected">Expected</TabsTrigger><TabsTrigger value="optimistic">Optimistic</TabsTrigger></TabsList>
                      </Tabs>
                      {price > res.maxPrice ? (
                        <Alert className="bg-warn-muted text-foreground"><CircleAlert className="text-warn" /><AlertDescription className="text-foreground">Asking price is <b className="num">{money(price - res.maxPrice)}</b> above the <b className="num">{money(res.maxPrice)}</b> limit for a {settings.target}% target ROI. Negotiate or pass.</AlertDescription></Alert>
                      ) : (
                        <Alert className="bg-pos-muted"><CircleCheck className="text-pos" /><AlertDescription className="text-foreground">Asking price leaves <b className="num">{money(res.maxPrice - price)}</b> of headroom below the <b className="num">{money(res.maxPrice)}</b> limit.</AlertDescription></Alert>
                      )}
                    </CardContent>
                  </Card>
                </Reveal>

                <div className="grid gap-5 md:grid-cols-2">
                  <Reveal delay={60}>
                    <Card className="h-full">
                      <CardHeader><CardTitle>Cost breakdown</CardTitle></CardHeader>
                      <CardContent className="flex flex-col items-center gap-4">
                        <Donut slices={costs} center={money(c.cost)} sub="all-in" />
                        <div className="flex w-full flex-col gap-2 text-sm">
                          {costs.map((x) => <div key={x.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="size-2 rounded-sm" style={{ background: x.color }} />{x.name}</span><span className="num">{money(x.value)}</span></div>)}
                          <Separator />
                          <div className="flex justify-between font-semibold"><span>Total cost</span><span className="num">{money(c.cost)}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </Reveal>
                  <Reveal delay={120}>
                    <Card className="h-full">
                      <CardHeader><CardTitle>Purchase vs resale</CardTitle></CardHeader>
                      <CardContent className="flex flex-col gap-4 text-sm">
                        {[{ label: `Buy · ${form.country}`, v: price, cls: 'bg-chart-1' }, { label: 'Sell · Czechia', v: c.resale, cls: 'bg-pos' }].map((b) => {
                          const top = Math.max(price, c.resale) || 1;
                          return <div key={b.label}><div className="mb-1.5 flex justify-between"><span className="text-muted-foreground">{b.label}</span><span className="num">{money(b.v)}</span></div><div className="h-2 rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all duration-700', b.cls)} style={{ width: `${(b.v / top) * 100}%` }} /></div></div>;
                        })}
                        <Separator />
                        <div className="flex justify-between"><span className="text-muted-foreground">Gross spread</span><span className="num">{money(c.resale - price)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Max purchase price</span><span className="num">{money(res.maxPrice)}</span></div>
                        <p className="text-xs text-muted-foreground">For a {settings.target}% target ROI. Change the target in Settings.</p>
                      </CardContent>
                    </Card>
                  </Reveal>
                </div>

                <Reveal>
                  <Card>
                    <CardHeader><CardTitle>What should I offer?</CardTitle><CardDescription>Every €1 off the purchase price is €1 of profit.</CardDescription></CardHeader>
                    <CardContent><OfferChart asking={price} net={res.expected.net} target={Math.max(0, res.maxPrice)} format={money} /></CardContent>
                  </Card>
                </Reveal>

                <Reveal>
                  <Card>
                    <CardHeader><CardTitle>Scenarios</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead /><TableHead className="text-right">Conservative</TableHead><TableHead className="text-right">Expected</TableHead><TableHead className="text-right">Optimistic</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {([['Resale value', (k: Result['expected']) => money(k.resale)], ['Repairs', (k: Result['expected']) => money(k.repairs)], ['Net profit', (k: Result['expected']) => money(k.net)], ['ROI', (k: Result['expected']) => pct(k.roi)]] as const).map(([label, fn]) => (
                            <TableRow key={label}>
                              <TableCell className="text-muted-foreground">{label}</TableCell>
                              {[res.conservative, res.expected, res.optimistic].map((k, i) => <TableCell key={i} className={cn('num text-right', label === 'Net profit' && 'font-semibold', label === 'Net profit' && (k.net >= 0 ? 'text-pos' : 'text-destructive'))}>{fn(k)}</TableCell>)}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <p className="mt-3 text-xs text-muted-foreground">Conservative: resale −6%, repairs +40%, 50% longer to sell. Optimistic: resale +4%, repairs −20%, 30% faster.</p>
                    </CardContent>
                  </Card>
                </Reveal>

                <Reveal>
                  <Card>
                    <CardHeader><CardTitle>Risk assessment</CardTitle></CardHeader>
                    <CardContent className="flex flex-col divide-y">
                      {res.risk.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"><span>{r.text}</span><LevelBadge level={r.level}>{r.level === 'r' ? 'Risk' : r.level === 'a' ? 'Watch' : 'OK'}</LevelBadge></div>
                      ))}
                    </CardContent>
                  </Card>
                </Reveal>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
