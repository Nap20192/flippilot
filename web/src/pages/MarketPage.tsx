import { useState } from 'react';
import { Reveal, AnimatedNumber } from '@/components/animated';
import { AppShell, PageHeader } from '@/components/app-shell';
import { MarketBars } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MARKET, marketRows } from '@/data/market';
import { useStore } from '@/store';

const rate = (s: { cur: string; fxCZK: number; fxPLN: number }) => (s.cur === 'CZK' ? s.fxCZK : s.cur === 'PLN' ? s.fxPLN : 1);

export default function MarketPage() {
  const { money, settings } = useStore();
  const models = Object.keys(MARKET);
  const [model, setModel] = useState(models[0]);
  const rows = marketRows(model);
  const d = MARKET[model];
  const spread = d.Czechia - d.Germany;
  const fixed = 450 + 300;
  const r = rate(settings);

  return (
    <AppShell title="Market intelligence">
      <PageHeader title="Market intelligence" description="Compare reference prices for the same vehicle across countries." actions={<Badge variant="secondary" className="bg-warn-muted text-warn">Fictional demo reference prices</Badge>} />
      <Reveal className="mb-5 overflow-x-auto">
        <Tabs value={model} onValueChange={setModel}>
          <TabsList className="h-auto flex-wrap justify-start">{models.map((m) => <TabsTrigger key={m} value={m} className="h-8 flex-none px-3">{m.split(',')[0]}</TabsTrigger>)}</TabsList>
        </Tabs>
      </Reveal>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Reveal delay={60}>
          <Card className="h-full">
            <CardHeader><CardTitle>Resale price by country</CardTitle><CardDescription>Cheapest market in green, most expensive in blue.</CardDescription></CardHeader>
            <CardContent><MarketBars key={model} data={rows.map((x) => ({ name: x.name, value: x.value * r }))} format={(v) => money(v / r)} /></CardContent>
          </Card>
        </Reveal>
        <Reveal delay={120}>
          <Card className="h-full">
            <CardHeader><CardDescription>Germany → Czechia gross spread</CardDescription>
              <CardTitle className={cn('num text-4xl tracking-tight', spread >= 0 ? 'text-pos' : 'text-destructive')}><AnimatedNumber key={model} value={spread} format={money} /></CardTitle>
              <CardDescription>{((spread / d.Germany) * 100).toFixed(1)}% before costs</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex h-9 overflow-hidden rounded-lg text-[11px] font-medium text-white">
                <div className="grid place-items-center bg-foreground text-background" style={{ flex: 70 }}>Buy</div>
                <div className="grid place-items-center bg-indigo-500" style={{ flex: Math.max(6, (fixed / spread) * 20) }}>Costs</div>
                <div className="grid place-items-center bg-pos" style={{ flex: Math.max(8, ((spread - fixed) / spread) * 20) }}>Net</div>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transport DE → CZ</span><span className="num">{money(450)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Registration</span><span className="num">{money(300)}</span></div>
              <Separator />
              <div className="flex justify-between font-medium"><span>Left after fixed costs</span><span className="num">{money(spread - fixed)}</span></div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </AppShell>
  );
}
