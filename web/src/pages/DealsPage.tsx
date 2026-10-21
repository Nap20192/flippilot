import { ChevronDown, CircleAlert, RotateCcw, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { DealRules, Item, Vehicle } from '@/api';
import { AnimatedNumber, Reveal } from '@/components/animated';
import { AppShell, PageHeader } from '@/components/app-shell';
import { LevelBadge } from '@/components/level-badge';
import { SimpleSelect } from '@/components/simple-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { curSymbol, pct, rateOf, toDisplay } from '@/format';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

const n = (s: string) => { const v = parseFloat(s.replace(/,/g, '')); return Number.isFinite(v) ? v : NaN; };
const RISKS = [{ value: 'Low', label: 'Low only' }, { value: 'Medium', label: 'Up to medium' }, { value: 'High', label: 'Any risk' }] as const;
const DEFAULTS: DealRules = { capital: 30000, reservePct: 15, minPositionPct: 10, maxPositionPct: 90, minProfit: 500, minMargin: 3, minROI: 3, maxLoss: 1200, maxRisk: 'Medium' };
const COUNTRIES = [{ value: 'all', label: 'All' }, ...['DE', 'AT', 'NL', 'BE', 'PL'].map((v) => ({ value: v, label: v }))];

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

export default function DealsPage() {
  const { rules, updateRules, deals, items, money, setDraft, isWatched, toggleWatch, settings } = useStore();
  const rate = rateOf(settings);
  const sym = curSymbol(settings);
  const prevRate = useRef(rate);
  const nav = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const [risk, setRisk] = useState<DealRules['maxRisk']>('Medium');
  const [errs, setErrs] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [fc, setFc] = useState('all');
  const [fm, setFm] = useState('all');
  const [fp, setFp] = useState('');
  const [fk, setFk] = useState('');

  useEffect(() => {
    if (rules.capital == null) return;
    setF({
      capital: toDisplay(rules.capital, rate), reservePct: String(rules.reservePct), minPositionPct: String(rules.minPositionPct), maxPositionPct: String(rules.maxPositionPct),
      minProfit: toDisplay(rules.minProfit, rate), minMargin: String(rules.minMargin), minROI: String(rules.minROI), maxLoss: toDisplay(rules.maxLoss, rate),
    });
    setRisk(rules.maxRisk);
  }, [rules, rate]);
  useEffect(() => {
    if (prevRate.current === rate) return;
    const k = rate / prevRate.current;
    prevRate.current = rate;
    setFp((x) => (x.trim() === '' ? '' : String(Math.round(n(x) * k * 100) / 100)));
  }, [rate]);

  const draftRules = useMemo<DealRules>(() => ({
    ...rules, capital: n(f.capital ?? '') / rate, reservePct: n(f.reservePct ?? ''), minPositionPct: n(f.minPositionPct ?? ''), maxPositionPct: n(f.maxPositionPct ?? ''),
    minProfit: n(f.minProfit ?? '') / rate, minMargin: n(f.minMargin ?? ''), minROI: n(f.minROI ?? ''), maxLoss: n(f.maxLoss ?? '') / rate, maxRisk: risk,
  }), [rules, f, risk, rate]);

  const validate = (b: DealRules) => {
    const e: string[] = [];
    if (![b.capital, b.reservePct, b.minPositionPct, b.maxPositionPct, b.minProfit, b.minMargin, b.minROI, b.maxLoss].every(Number.isFinite)) return ['Complete all budget and risk fields with valid numbers.'];
    if (!(b.capital > 0)) e.push('Available capital must be greater than zero.');
    if ([b.minProfit, b.minMargin, b.minROI, b.maxLoss].some((x) => x < 0)) e.push('Profit, ROI, margin and downside limits cannot be negative.');
    if ([b.reservePct, b.minPositionPct, b.maxPositionPct].some((x) => x < 0 || x > 100)) e.push('Reserve and position allocation percentages must be between 0% and 100%.');
    if (b.reservePct >= 100) e.push('The cash reserve must be below 100% to leave capital for purchases.');
    if (b.minPositionPct > b.maxPositionPct) e.push('Minimum per-car allocation cannot exceed the maximum.');
    return e;
  };
  const apply = (b: DealRules) => { const e = validate(b); setErrs(e); if (!e.length) void updateRules(b); };
  const setField = (k: string) => (ev: ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: ev.target.value });
    const raw = n(ev.target.value);
    apply({ ...draftRules, [k]: k === 'capital' || k === 'minProfit' || k === 'maxLoss' ? raw / rate : raw } as DealRules);
  };

  const cap = deals.capital;
  const makes = useMemo(() => [{ value: 'all', label: 'All' }, ...[...new Set(items.map((i) => i.vehicle.make))].map((v) => ({ value: v, label: v }))], [items]);
  const pass = (i: Item) => {
    const v = i.vehicle;
    return (!q || `${v.make} ${v.model}`.toLowerCase().includes(q.toLowerCase())) && (fc === 'all' || v.country === fc) && (fm === 'all' || v.make === fm)
      && (!fp || v.price <= n(fp) / rate) && (!fk || v.km <= n(fk));
  };
  const matches = deals.matches.filter(pass);
  const excluded = deals.excluded.filter(pass);
  const open = (i: Item) => { setDraft(i.vehicle); nav('/app/analyze'); };
  const star = async (v: Vehicle) => { const was = isWatched(v.id); await toggleWatch(v); toast(was ? 'Removed from watchlist' : 'Saved to watchlist'); };

  return (
    <AppShell title="Deal finder">
      <PageHeader title="Deal finder" description="See which vehicles fit your capital, profit targets and downside limits." />

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Budget & risk manager</CardTitle>
            <CardDescription>Every listing is screened against these rules before it shows as an eligible deal.</CardDescription>
            <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end"><Button size="sm" variant="outline" onClick={() => { setErrs([]); void updateRules(DEFAULTS); toast('Strategy reset'); }}><RotateCcw data-icon="inline-start" />Reset</Button></div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {errs.length > 0 ? (
              <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-1"><CircleAlert /><AlertDescription>{errs.join(' ')}</AlertDescription></Alert>
            ) : cap && (
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border lg:grid-cols-4">
                {[['Total capital', cap.capital], ['Safety reserve', cap.reserve], ['Deployable funds', cap.deployable]].map(([l, v]) => (
                  <div key={l as string} className="border-b border-r p-4 lg:border-b-0"><div className="text-xs text-muted-foreground">{l}</div><AnimatedNumber value={v as number} format={money} duration={600} className="num text-xl font-semibold tracking-tight" /></div>
                ))}
                <div className="bg-muted/60 p-4"><div className="text-xs text-muted-foreground">All-in limit per vehicle</div><div className="num text-xl font-semibold tracking-tight">{money(cap.min)}–{money(cap.max)}</div></div>
              </div>
            )}
            <div>
              <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Capital & position sizing</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field id="cap" label={`Total trading capital (${sym})`}><Input id="cap" className="num" inputMode="decimal" value={f.capital ?? ''} onChange={setField('capital')} /></Field>
                <Field id="res" label="Keep uninvested (%)"><Input id="res" className="num" inputMode="decimal" value={f.reservePct ?? ''} onChange={setField('reservePct')} /></Field>
                <Field id="minp" label="Minimum per deal (%)"><Input id="minp" className="num" inputMode="decimal" value={f.minPositionPct ?? ''} onChange={setField('minPositionPct')} /></Field>
                <Field id="maxp" label="Maximum per deal (%)"><Input id="maxp" className="num" inputMode="decimal" value={f.maxPositionPct ?? ''} onChange={setField('maxPositionPct')} /></Field>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Profit & risk thresholds</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Field id="mprof" label={`Min. expected profit (${sym})`}><Input id="mprof" className="num" inputMode="decimal" value={f.minProfit ?? ''} onChange={setField('minProfit')} /></Field>
                <Field id="mmar" label="Min. resale margin (%)"><Input id="mmar" className="num" inputMode="decimal" value={f.minMargin ?? ''} onChange={setField('minMargin')} /></Field>
                <Field id="mroi" label="Min. ROI on cost (%)"><Input id="mroi" className="num" inputMode="decimal" value={f.minROI ?? ''} onChange={setField('minROI')} /></Field>
                <Field id="mloss" label={`Max. conservative loss (${sym})`}><Input id="mloss" className="num" inputMode="decimal" value={f.maxLoss ?? ''} onChange={setField('maxLoss')} /></Field>
                <Field id="mrisk" label="Max. risk rating"><SimpleSelect id="mrisk" value={risk} options={RISKS} className="w-full" onValueChange={(r) => { setRisk(r); apply({ ...draftRules, maxRisk: r }); }} /></Field>
              </div>
            </div>
            <p className="max-w-3xl text-xs text-muted-foreground">Per-car limits apply to deployable funds after the reserve. All-in cost includes purchase, transport, registration, repairs and selling costs. Monetary inputs follow the display currency and are stored in EUR. These are fictional demo estimates, not verified risk probabilities.</p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={60} className="mt-5">
        <Card>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(4,minmax(0,1fr))]">
            <Field id="q" label="Search">
              <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="q" placeholder="Model, make…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            </Field>
            <Field id="fc" label="Source country"><SimpleSelect id="fc" value={fc} options={COUNTRIES} onValueChange={setFc} className="w-full" /></Field>
            <Field id="fm" label="Manufacturer"><SimpleSelect id="fm" value={fm} options={makes} onValueChange={setFm} className="w-full" /></Field>
            <Field id="fp" label={`Max asking (${sym})`}><Input id="fp" className="num" inputMode="decimal" placeholder="Any" value={fp} onChange={(e) => setFp(e.target.value)} /></Field>
            <Field id="fk" label="Max mileage (km)"><Input id="fk" className="num" inputMode="numeric" placeholder="Any" value={fk} onChange={(e) => setFk(e.target.value)} /></Field>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={100} className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle>{matches.length} suitable {matches.length === 1 ? 'deal' : 'deals'}</CardTitle>
            <CardDescription>From {matches.length + excluded.length} demo listings matching your search · {excluded.length} outside your strategy</CardDescription>
            <div className="col-start-2 row-span-2 row-start-1 flex gap-1.5 self-start justify-self-end"><LevelBadge level="g">{matches.length} within limits</LevelBadge><LevelBadge level="a">{excluded.length} screened out</LevelBadge></div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">All-in</TableHead><TableHead className="text-right">Est. resale</TableHead><TableHead className="text-right">Net profit</TableHead><TableHead className="text-right">ROI</TableHead><TableHead>Score</TableHead><TableHead>Risk</TableHead><TableHead className="sr-only">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {matches.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center whitespace-normal text-muted-foreground">No deals satisfy these limits. Try a larger per-car allocation, a lower profit requirement or a higher risk allowance. Your criteria are not being ignored.</TableCell></TableRow>}
                {matches.map((i, idx) => {
                  const r = i.result;
                  return (
                    <TableRow key={i.vehicle.id} className="animate-in fade-in-0 slide-in-from-left-3 fill-mode-both duration-500 motion-reduce:animate-none" style={{ animationDelay: `${idx * 50}ms` }}>
                      <TableCell><div className="font-medium">{i.vehicle.make} {i.vehicle.model}</div><div className="text-xs text-muted-foreground">{i.vehicle.year} · {i.vehicle.km.toLocaleString('en-US')} km · {i.vehicle.engine} · {i.vehicle.country}</div></TableCell>
                      <TableCell className="num text-right">{money(i.vehicle.price)}</TableCell><TableCell className="num text-right">{money(r.expected.cost)}</TableCell><TableCell className="num text-right">{money(r.resale)}</TableCell>
                      <TableCell className={cn('num text-right font-semibold', r.expected.net >= 0 ? 'text-pos' : 'text-destructive')}>{money(r.expected.net)}</TableCell>
                      <TableCell className="num text-right">{pct(r.expected.roi)}</TableCell>
                      <TableCell><Badge variant="outline" className="num">{r.score}</Badge></TableCell>
                      <TableCell><LevelBadge level={r.riskLevel.level}>{r.riskLevel.label}</LevelBadge></TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => open(i)}>Analyze</Button>
                        <Button size="icon-sm" variant="ghost" aria-label={isWatched(i.vehicle.id) ? 'Remove from watchlist' : 'Add to watchlist'} onClick={() => void star(i.vehicle)}><Star className={cn(isWatched(i.vehicle.id) && 'fill-current text-warn')} /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Reveal>

      {excluded.length > 0 && (
        <Reveal delay={140} className="mt-5">
          <Collapsible className="rounded-xl border bg-card">
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left font-medium transition-colors hover:bg-muted/50">
              Why were {excluded.length} listings excluded?
              <ChevronDown className="size-4 text-muted-foreground transition-transform duration-300 group-aria-expanded:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="divide-y border-t">
                {excluded.map((x) => (
                  <div key={x.vehicle.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="flex min-w-0 flex-col gap-2"><span className="font-medium">{x.vehicle.make} {x.vehicle.model} ({x.vehicle.year})</span><span className="flex flex-wrap gap-1.5">{x.reasons.map((why) => <Badge key={why} variant="outline">{why}</Badge>)}</span></div>
                    <div className="num text-right text-sm text-muted-foreground">All-in {money(x.result.expected.cost)}<br />Projected <span className={x.result.expected.net >= 0 ? 'text-pos' : 'text-destructive'}>{money(x.result.expected.net)}</span></div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Reveal>
      )}
    </AppShell>
  );
}
