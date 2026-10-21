import { ArrowRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatedNumber, Reveal } from '@/components/animated';
import { AppShell, PageHeader } from '@/components/app-shell';
import { Donut, Funnel, MarketBars, OfferChart, ProfitBars, RangeRows } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MARKET, marketRows } from '@/data/market';
import { makeCompact } from '@/format';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

type Scenario = 'conservative' | 'expected' | 'optimistic';
const short = (make: string, model: string) => `${make === 'Volkswagen' ? 'VW' : make} ${model.split(' ').slice(0, 2).join(' ')}`;
const PALETTE = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-slate-400'];

function Kpi({ label, children, foot, delay }: { label: string; children: React.ReactNode; foot: React.ReactNode; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Card className="h-full gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="pb-0"><CardDescription>{label}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-2.5">{children}<div className="text-xs text-muted-foreground">{foot}</div></CardContent>
      </Card>
    </Reveal>
  );
}

export default function DashboardPage() {
  const { items, deals, rules, money, watch, ready, setDraft, settings } = useStore();
  const compact = useMemo(() => makeCompact(settings), [settings]);
  const nav = useNavigate();
  const [sc, setSc] = useState<Scenario>('expected');

  const d = useMemo(() => {
    const n = items.length;
    const net = (i: (typeof items)[number]) => i.result[sc].net;
    const sumPrice = items.reduce((t, i) => t + i.vehicle.price, 0);
    const countries: Record<string, number> = {};
    items.forEach((i) => { countries[i.vehicle.country] = (countries[i.vehicle.country] ?? 0) + 1; });
    const profitable = items.filter((i) => net(i) > 0);
    const avgScore = n ? items.reduce((t, i) => t + i.result.score, 0) / n : 0;
    const bestScore = n ? items.reduce((a, b) => (b.result.score > a.result.score ? b : a)) : null;
    const best = n ? items.reduce((a, b) => (b.result.expected.net > a.result.expected.net ? b : a)) : null;
    const cap = deals.capital;
    const inBudget = cap ? items.filter((i) => i.result.expected.cost >= cap.min - 0.005 && i.result.expected.cost <= cap.max + 0.005) : items;
    const withProfit = inBudget.filter((i) => i.result.expected.net >= (rules.minProfit ?? 0));
    return {
      n, sumPrice, countries: Object.entries(countries).sort((a, b) => b[1] - a[1]),
      profit: profitable.reduce((t, i) => t + net(i), 0), profitable: profitable.length, avgScore, bestScore, best,
      ranges: items.map((i) => ({ name: short(i.vehicle.make, i.vehicle.model), cons: i.result.conservative.net, exp: i.result.expected.net, opt: i.result.optimistic.net })),
      bars: [...items].sort((a, b) => net(b) - net(a)).map((i) => ({ name: short(i.vehicle.make, i.vehicle.model).replace('Škoda ', '').replace(' Avant', ''), v: Math.round(net(i)) })),
      funnel: [
        { label: 'All listings', n },
        { label: 'Fit the per-car budget', n: inBudget.length },
        { label: `Profit ≥ ${money(rules.minProfit ?? 0)}`, n: withProfit.length, good: true },
        { label: 'Margin, ROI, loss and risk', n: deals.matches.length, good: true },
      ],
    };
  }, [items, deals, rules, sc, money]);

  const extras = d.best ? [
    { name: 'Repairs', value: d.best.result.expected.repairs, color: 'var(--chart-3)' },
    { name: 'Fees & selling', value: d.best.result.expected.fees, color: 'var(--chart-1)' },
    { name: 'Transport', value: d.best.result.transport, color: 'var(--chart-2)' },
    { name: `Holding, ${d.best.result.days} d`, value: d.best.result.expected.hold, color: 'var(--chart-4)' },
    { name: 'Registration', value: d.best.result.registration, color: 'var(--chart-5)' },
  ] : [];
  const extraTotal = extras.reduce((t, x) => t + x.value, 0);
  const golf = marketRows(Object.keys(MARKET)[0]);

  if (!ready) {
    return (
      <AppShell title="Dashboard">
        <PageHeader title="Pipeline analytics" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <PageHeader
        title="Pipeline analytics"
        description={`${d.n} listings from ${d.countries.map(([c]) => c).join(', ')} → Czechia. Scenario: ${sc}.`}
        actions={<>
          <Tabs value={sc} onValueChange={(v) => setSc(v as Scenario)}>
            <TabsList><TabsTrigger value="conservative" className="px-3">Conservative</TabsTrigger><TabsTrigger value="expected" className="px-3">Expected</TabsTrigger><TabsTrigger value="optimistic" className="px-3">Optimistic</TabsTrigger></TabsList>
          </Tabs>
          <Button nativeButton={false} render={<Link to="/app/analyze" />}><Plus data-icon="inline-start" />New analysis</Button>
        </>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Pipeline value" delay={0} foot={d.countries.map(([c, k]) => `${c} ${k}`).join(' · ') + ' listings'}>
          <AnimatedNumber value={d.sumPrice} format={money} className="num text-2xl font-semibold tracking-tight" />
          <div className="flex h-1.5 gap-0.5">{d.countries.map(([c, k], i) => <i key={c} className={cn('rounded-full transition-all duration-700', PALETTE[i % PALETTE.length])} style={{ flex: k }} />)}</div>
        </Kpi>
        <Kpi label={`Expected profit · ${sc}`} delay={70} foot={`${d.profitable} of ${d.n} listings in profit`}>
          <AnimatedNumber value={d.profit} format={money} className={cn('num text-2xl font-semibold tracking-tight', d.profit >= 0 ? 'text-pos' : 'text-destructive')} />
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-pos transition-all duration-700" style={{ width: `${d.n ? (d.profitable / d.n) * 100 : 0}%` }} /></div>
        </Kpi>
        <Kpi label="Average deal score" delay={140} foot={d.bestScore ? `Best: ${d.bestScore.vehicle.make} ${d.bestScore.vehicle.model} at ${d.bestScore.result.score}` : ''}>
          <div className="flex items-baseline gap-1"><AnimatedNumber value={d.avgScore} format={(n) => String(Math.round(n))} className="num text-2xl font-semibold" /><span className="text-sm text-muted-foreground">/100</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-warn transition-all duration-700" style={{ width: `${d.avgScore}%` }} /></div>
        </Kpi>
        <Kpi label="Pass your strategy" delay={210} foot={deals.matches.map((m) => m.vehicle.model.split(' ').slice(0, 2).join(' ')).slice(0, 2).join(' and ') || 'No listing passes yet'}>
          <div className="flex items-baseline gap-1"><AnimatedNumber value={deals.matches.length} format={(n) => String(Math.round(n))} className="num text-2xl font-semibold" /><span className="text-sm text-muted-foreground">of {d.n}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-pos transition-all duration-700" style={{ width: `${d.n ? (deals.matches.length / d.n) * 100 : 0}%` }} /></div>
        </Kpi>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Reveal><Card className="h-full"><CardHeader><CardTitle>Profit range by vehicle</CardTitle><CardDescription>Bar spans conservative → optimistic. Dot is the expected case.</CardDescription></CardHeader><CardContent><RangeRows rows={d.ranges} format={money} /></CardContent></Card></Reveal>
        <Reveal delay={80}><Card className="h-full"><CardHeader><CardTitle>Profit by vehicle · {sc}</CardTitle><CardDescription>Ranked best to worst. Dashed line is your {money(rules.minProfit ?? 0)} minimum profit.</CardDescription></CardHeader><CardContent><ProfitBars key={sc} data={d.bars} threshold={rules.minProfit} format={money} compact={compact} /></CardContent></Card></Reveal>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Reveal><Card className="h-full">
          <CardHeader><CardTitle>Costs on top of purchase</CardTitle><CardDescription>{d.best ? `${d.best.vehicle.make} ${d.best.vehicle.model} · ${money(extraTotal)} beyond the ${money(d.best.vehicle.price)} price` : ''}</CardDescription></CardHeader>
          <CardContent className="flex flex-col items-center gap-5 sm:flex-row">
            <Donut slices={extras} center={money(extraTotal)} sub={d.best ? `${((extraTotal / d.best.vehicle.price) * 100).toFixed(1)}% of price` : ''} />
            <div className="flex w-full flex-col gap-2 text-sm">{extras.map((x) => <div key={x.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="size-2 rounded-sm" style={{ background: x.color }} />{x.name}</span><span className="num">{money(x.value)}</span></div>)}</div>
          </CardContent>
        </Card></Reveal>
        <Reveal delay={80}><Card className="h-full">
          <CardHeader><CardTitle>Same car, six markets</CardTitle><CardDescription>VW Golf 8 2.0 TDI, 2021 · reference resale prices</CardDescription></CardHeader>
          <CardContent><MarketBars data={golf} format={money} /></CardContent>
        </Card></Reveal>
        <Reveal delay={160}><Card className="h-full">
          <CardHeader><CardTitle>Strategy screening</CardTitle><CardDescription>How the {d.n} listings drop out at each rule</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4"><Funnel steps={d.funnel} /><p className="text-xs text-muted-foreground">{d.funnel[2].n < d.funnel[1].n ? 'The profit target removes deals at this step; lower it in Deal finder to see more.' : 'Every listing in budget meets the profit target.'}</p></CardContent>
        </Card></Reveal>
      </div>

      {d.best && (
        <Reveal className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>What should I offer? · {d.best.vehicle.make} {d.best.vehicle.model}</CardTitle>
              <CardDescription>Expected net profit at each purchase price. Every €1 off the price is €1 of profit.</CardDescription>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span className="rounded-full border px-2.5 py-1 text-brand">Target ≤ {money(d.best.result.maxPrice)}</span>
                <span className="rounded-full border px-2.5 py-1">Asking {money(d.best.vehicle.price)}</span>
                <span className="rounded-full border px-2.5 py-1 text-destructive">Break-even {money(d.best.vehicle.price + d.best.result.expected.net)}</span>
              </div>
            </CardHeader>
            <CardContent><OfferChart asking={d.best.vehicle.price} net={d.best.result.expected.net} target={d.best.result.maxPrice} format={money} /></CardContent>
          </Card>
        </Reveal>
      )}

      <Reveal className="mt-5">
        <Card>
          <CardHeader><CardTitle>Highest-scoring deals</CardTitle><CardDescription>Open one in the analyzer.</CardDescription></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[...items].sort((a, b) => b.result.score - a.result.score).slice(0, 4).map((i) => (
              <button key={i.vehicle.id} type="button" onClick={() => { setDraft(i.vehicle); nav('/app/analyze'); }}
                className="group flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md">
                <span className="num grid size-10 place-items-center rounded-lg bg-muted font-semibold">{i.result.score}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.vehicle.make} {i.vehicle.model}</span><span className="block text-xs text-muted-foreground">{i.vehicle.year} · {i.vehicle.km.toLocaleString('en-US')} km · {i.vehicle.country}</span></span>
                <span className="text-right"><span className={cn('num block font-semibold', i.result.expected.net >= 0 ? 'text-pos' : 'text-destructive')}>{money(i.result.expected.net)}</span><span className="num text-xs text-muted-foreground">{(i.result.expected.roi * 100).toFixed(1)}% ROI</span></span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </CardContent>
        </Card>
      </Reveal>
      <p className="mt-6 text-center text-xs text-muted-foreground">Demo data: fictional listings and reference prices. {watch.length ? `${watch.length} on your watchlist.` : ''}</p>
    </AppShell>
  );
}
