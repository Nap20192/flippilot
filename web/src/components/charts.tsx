import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { AnimatedNumber, InView, useInView } from '@/components/animated';
import { cn } from '@/lib/utils';

const scoreColor = (s: number) => (s >= 70 ? 'var(--pos)' : s >= 50 ? 'var(--brand)' : s >= 30 ? 'var(--warn)' : 'var(--destructive)');

/** Half-circle deal score gauge. */
export function ScoreGauge({ score, className }: { score: number; className?: string }) {
  return (
    <InView className={cn('relative mx-auto h-[104px] w-[170px]', className)}>
    <div className="relative size-full" role="img" aria-label={`Deal score ${score} out of 100`}>
      <ChartContainer config={{ v: { label: 'Score' } }} className="aspect-auto h-[170px] w-[170px]">
        <RadialBarChart data={[{ v: score, fill: scoreColor(score) }]} startAngle={180} endAngle={0} innerRadius={62} outerRadius={84} cx="50%" cy="62%">
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
          <RadialBar dataKey="v" angleAxisId={0} cornerRadius={9} background={{ fill: 'var(--muted)' }} isAnimationActive animationBegin={150} animationDuration={1300} animationEasing="ease-out" />
        </RadialBarChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[48px] text-center">
        <AnimatedNumber value={score} format={(n) => String(Math.round(n))} className="num text-3xl font-semibold" />
      </div>
    </div>
    </InView>
  );
}

export type Slice = { name: string; value: number; color: string };

/** Donut with a centre label. */
export function Donut({ slices, center, sub, className }: { slices: Slice[]; center: string; sub?: string; className?: string }) {
  return (
    <InView className={cn('relative mx-auto size-[168px] shrink-0', className)}>
      <ChartContainer config={{}} className="aspect-square size-[168px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
          <Pie data={slices} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={2} cornerRadius={4} strokeWidth={0} isAnimationActive animationBegin={100} animationDuration={1300} animationEasing="ease-out">
            {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-lg font-semibold tracking-tight">{center}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </InView>
  );
}

/** Ranked columns: green profit, red loss, optional threshold line. */
export function ProfitBars({ data, threshold, format, compact, thresholdLabel, className }: {
  data: { name: string; v: number }[]; threshold?: number; format: (v: number) => string; compact?: (v: number) => string; thresholdLabel?: string; className?: string;
}) {
  return (
    <InView className={cn('h-[300px] w-full', className)}>
    <ChartContainer config={{ v: { label: 'Expected profit' } }} className="aspect-auto size-full">
      <BarChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tickMargin={8} fontSize={10} angle={-28} textAnchor="end" height={54} />
        <YAxis hide domain={['auto', 'auto']} />
        <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltipContent hideLabel formatter={(value, _n, item) => (
          <div className="flex w-full items-center justify-between gap-6"><span className="text-muted-foreground">{(item.payload as { name: string }).name}</span><span className="num font-medium">{format(Number(value))}</span></div>
        )} />} />
        <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.3} />
        {threshold != null && <ReferenceLine y={threshold} stroke="var(--pos)" strokeDasharray="4 4" label={{ value: thresholdLabel ?? 'Minimum profit', position: 'insideTopRight', fontSize: 10, fill: 'var(--pos)' }} />}
        <Bar dataKey="v" radius={[5, 5, 5, 5]} maxBarSize={34} isAnimationActive animationBegin={100} animationDuration={1200} animationEasing="ease-out">
          {data.map((d) => <Cell key={d.name} fill={d.v >= 0 ? 'var(--pos)' : 'var(--destructive)'} />)}
          {compact && (
            <LabelList dataKey="v" content={(p) => {
              const { x = 0, y = 0, width = 0, height = 0, value = 0 } = p as { x?: number; y?: number; width?: number; height?: number; value?: number };
              const top = Math.min(y, y + height), bottom = Math.max(y, y + height);
              return <text x={Number(x) + Number(width) / 2} y={Number(value) >= 0 ? top - 5 : bottom + 13} textAnchor="middle" fontSize={10} className="num fill-foreground">{compact(Number(value))}</text>;
            }} />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
    </InView>
  );
}

/** Conservative -> optimistic range per item with the expected case as a dot. */
export function RangeRows({ rows, format }: { rows: { name: string; cons: number; exp: number; opt: number }[]; format: (v: number) => string }) {
  const [ref, mounted] = useInView<HTMLDivElement>();
  if (!rows.length) return null;
  const raw = [Math.min(0, ...rows.map((r) => r.cons)), Math.max(0, ...rows.map((r) => r.opt))];
  const pad = (raw[1] - raw[0]) * 0.06 || 100;
  const lo = raw[0] - pad, hi = raw[1] + pad;
  const p = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div ref={ref} className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={r.name} className="grid grid-cols-[minmax(0,110px)_1fr_64px] items-center gap-3 text-xs sm:grid-cols-[130px_1fr_70px]" title={`${r.name}: ${format(r.cons)} to ${format(r.opt)}`}>
          <span className="truncate text-muted-foreground">{r.name}</span>
          <div className="relative h-3.5">
            <div className="absolute inset-x-0 top-[6px] h-0.5 rounded bg-muted" />
            <div className="absolute inset-y-0 border-l border-dashed border-foreground/30" style={{ left: `${p(0)}%` }} />
            <div
              className={cn('absolute top-[3px] h-2 origin-left rounded-full bg-gradient-to-r from-destructive/60 to-pos/70 transition-transform duration-[900ms] ease-out', !mounted && 'scale-x-0')}
              style={{ left: `${p(r.cons)}%`, width: `${p(r.opt) - p(r.cons)}%`, transitionDelay: `${i * 45}ms` }}
            />
            <div
              className={cn('absolute top-0 size-3.5 -translate-x-1/2 rounded-full border-2 border-card shadow transition-all duration-500', mounted ? 'scale-100 opacity-100' : 'scale-0 opacity-0', r.exp >= 0 ? 'bg-pos' : 'bg-destructive')}
              style={{ left: `${p(r.exp)}%`, transitionDelay: `${500 + i * 45}ms` }}
            />
          </div>
          <span className={cn('num text-right', r.exp >= 0 ? 'text-pos' : 'text-destructive')}>{format(r.exp)}</span>
        </div>
      ))}
    </div>
  );
}

/** Profit as a function of the purchase price (one-for-one), with target / asking / break-even markers. */
export function OfferChart({ asking, net, target, format }: { asking: number; net: number; target: number; format: (v: number) => string }) {
  const from = asking - 2500, to = asking + 2500;
  const data = Array.from({ length: 21 }, (_, i) => { const price = from + (i * (to - from)) / 20; return { price, profit: net + (asking - price) }; });
  const be = asking + net;
  return (
    <InView className="h-[260px] w-full">
    <ChartContainer config={{ profit: { label: 'Net profit', color: 'var(--brand)' } }} className="aspect-auto size-full">
      <AreaChart data={data} margin={{ top: 22, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="offer-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} /><stop offset="95%" stopColor="var(--brand)" stopOpacity={0.02} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="price" type="number" domain={[from, to]} tickLine={false} axisLine={false} tickMargin={8} tickCount={6} tickFormatter={(v) => format(v)} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => format(v)} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_l, p) => `Purchase at ${format(Number(p?.[0]?.payload?.price ?? 0))}`} formatter={(v) => <span className="num font-medium">{format(Number(v))}</span>} />} />
        <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.3} strokeDasharray="3 3" />
        <ReferenceLine className="animate-in fade-in-0 duration-700 delay-[1100ms] fill-mode-both" x={target} stroke="var(--brand)" strokeDasharray="4 4" label={{ value: 'Target', position: 'top', fontSize: 11, fill: 'var(--brand)' }} />
        <ReferenceLine className="animate-in fade-in-0 duration-700 delay-[1250ms] fill-mode-both" x={asking} stroke="var(--foreground)" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: 'Asking', position: 'top', fontSize: 11, fill: 'var(--foreground)' }} />
        <ReferenceLine className="animate-in fade-in-0 duration-700 delay-[1400ms] fill-mode-both" x={be} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: 'Break-even', position: 'top', fontSize: 11, fill: 'var(--destructive)' }} />
        <Area dataKey="profit" type="linear" stroke="var(--brand)" strokeWidth={2.5} fill="url(#offer-fill)" isAnimationActive animationBegin={150} animationDuration={1600} animationEasing="ease-out" />
      </AreaChart>
    </ChartContainer>
    </InView>
  );
}

/** Horizontal bars, cheapest in green and most expensive in blue. */
export function MarketBars({ data, format }: { data: { name: string; value: number }[]; format: (v: number) => string }) {
  const lo = Math.min(...data.map((d) => d.value)), hi = Math.max(...data.map((d) => d.value));
  const min = Math.floor((lo - (hi - lo) * 0.6) / 100) * 100;
  const config: ChartConfig = { value: { label: 'Resale price', color: 'var(--chart-1)' } };
  return (
    <InView className="h-[300px] w-full">
    <ChartContainer config={config} className="aspect-auto size-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 56 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={92} fontSize={12} />
        <XAxis type="number" hide domain={[min, 'dataMax']} />
        <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltipContent hideLabel formatter={(v, _n, item) => <div className="flex w-full justify-between gap-6"><span className="text-muted-foreground">{(item.payload as { name: string }).name}</span><span className="num font-medium">{format(Number(v))}</span></div>} />} />
        <Bar dataKey="value" radius={6} isAnimationActive animationBegin={100} animationDuration={1200} animationEasing="ease-out" label={{ position: 'right', fontSize: 12, formatter: (v: unknown) => format(Number(v)), fill: 'var(--foreground)' }}>
          {data.map((d) => <Cell key={d.name} fill={d.value === lo ? 'var(--pos)' : d.value === hi ? 'var(--brand)' : 'var(--muted-foreground)'} fillOpacity={d.value === lo || d.value === hi ? 1 : 0.45} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
    </InView>
  );
}

/** Funnel steps as bars that grow from the left. */
export function Funnel({ steps }: { steps: { label: string; n: number; good?: boolean }[] }) {
  const [ref, mounted] = useInView<HTMLDivElement>();
  const max = Math.max(1, steps[0]?.n ?? 1);
  return (
    <div ref={ref} className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="mb-1 flex justify-between text-sm"><span>{s.label}</span><span className="num">{s.n}</span></div>
          <div className="h-6 overflow-hidden rounded-md bg-muted">
            <div
              className={cn('h-full origin-left rounded-md transition-transform duration-[900ms] ease-out', s.good ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-blue-400', !mounted && 'scale-x-0')}
              style={{ width: `${(s.n / max) * 100}%`, minWidth: s.n ? 6 : 0, transitionDelay: `${i * 120}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
