import { Camera, Plus, Star, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api, photoSrc, type WatchRow } from '@/api';
import { Reveal } from '@/components/animated';
import { AppShell, PageHeader } from '@/components/app-shell';
import { RangeRows } from '@/components/charts';
import { LevelBadge } from '@/components/level-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pct } from '@/format';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

function PhotoSlot({ row, canUpload, onDone }: { row: WatchRow; canUpload: boolean; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const src = photoSrc(row.photo);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const r = await api.uploadPhotos(row.vehicle.id, Array.from(files));
      if (r.rejected.length) toast.warning(r.rejected.map((x) => `${x.file}: ${x.error}`).join('\n'));
      else toast.success('Photo added');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not upload the photo.'); }
  };
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gradient-to-b from-card to-muted">
      {src ? <img src={src} alt={`${row.vehicle.make} ${row.vehicle.model}`} className="size-full object-cover transition-transform duration-700 group-hover/card:scale-105" /> : (
        <div className="grid size-full place-items-center text-xs text-muted-foreground"><Camera className="mb-1 size-6 opacity-50" /></div>
      )}
      {canUpload && (
        <>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void upload(e.target.files)} />
          <Button size="xs" variant="secondary" className="absolute right-2 bottom-2 shadow" onClick={() => input.current?.click()}><Camera data-icon="inline-start" />{src ? 'Add more' : 'Add photos'}</Button>
        </>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  const { watch, money, toggleWatch, setDraft, reload, user } = useStore();
  const nav = useNavigate();
  const best = watch.length ? watch.reduce((a, b) => (b.result.expected.net > a.result.expected.net ? b : a)) : null;
  const name = (w: WatchRow) => `${w.vehicle.make} ${w.vehicle.model}`;

  const rows: { label: string; get: (w: WatchRow) => number | string; show: (w: WatchRow) => string; hi?: boolean; lo?: boolean }[] = [
    { label: 'Net profit', get: (w) => w.result.expected.net, show: (w) => money(w.result.expected.net), hi: true },
    { label: 'ROI', get: (w) => w.result.expected.roi, show: (w) => pct(w.result.expected.roi), hi: true },
    { label: 'Deal score', get: (w) => w.result.score, show: (w) => String(w.result.score), hi: true },
    { label: 'Purchase price', get: (w) => w.vehicle.price, show: (w) => money(w.vehicle.price), lo: true },
    { label: 'Max recommended price', get: (w) => w.result.maxPrice, show: (w) => money(w.result.maxPrice), hi: true },
    { label: 'Risk', get: (w) => w.result.riskPoints, show: (w) => w.result.riskLevel.label, lo: true },
  ];

  return (
    <AppShell title="Watchlist">
      <PageHeader title="Watchlist" description="Compare saved opportunities. The best value in each row is highlighted."
        actions={<Button nativeButton={false} render={<Link to="/app/deals" />}><Plus data-icon="inline-start" />Add from Deal finder</Button>} />

      {watch.length === 0 ? (
        <Reveal>
          <Card className="items-center py-14 text-center">
            <Star className="size-10 text-muted-foreground/50" />
            <CardTitle className="mt-2">Nothing saved yet</CardTitle>
            <CardDescription>Add vehicles from the Deal finder or the analyzer.</CardDescription>
            <Button variant="outline" className="mt-3" nativeButton={false} render={<Link to="/app/deals" />}>Open Deal finder</Button>
          </Card>
        </Reveal>
      ) : (
        <div className="flex flex-col gap-5">
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {watch.map((w, i) => (
                <Card key={w.vehicle.id} className={cn('group/card gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg', best?.vehicle.id === w.vehicle.id && 'ring-2 ring-pos/40')} style={{ animationDelay: `${i * 70}ms` }}>
                  <CardContent className="flex flex-col gap-3">
                    <PhotoSlot row={w} canUpload={!!user} onDone={() => void reload()} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><div className="truncate font-semibold">{name(w)}</div><div className="text-xs text-muted-foreground">{w.vehicle.year} · {w.vehicle.km.toLocaleString('en-US')} km · {w.vehicle.country}</div></div>
                      <Badge variant="outline" className="num">{w.result.score}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><div className="text-muted-foreground">Profit</div><div className={cn('num text-sm font-semibold', w.result.expected.net >= 0 ? 'text-pos' : 'text-destructive')}>{money(w.result.expected.net)}</div></div>
                      <div><div className="text-muted-foreground">ROI</div><div className="num text-sm font-semibold">{pct(w.result.expected.roi)}</div></div>
                      <div><div className="text-muted-foreground">Max price</div><div className="num text-sm font-semibold">{money(w.result.maxPrice)}</div></div>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setDraft(w.vehicle); nav('/app/analyze'); }}>Analyze</Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove ${name(w)}`} onClick={() => void toggleWatch(w.vehicle).then(() => toast('Removed from watchlist'))}><Trash2 /></Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <Card>
              <CardHeader><CardTitle>Side by side</CardTitle><CardDescription>Best value in each row is highlighted.</CardDescription></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead />{watch.map((w) => <TableHead key={w.vehicle.id} className="text-right whitespace-nowrap">{name(w)}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const vals = watch.map((w) => Number(r.get(w)));
                      const bestV = r.hi ? Math.max(...vals) : r.lo ? Math.min(...vals) : null;
                      return (
                        <TableRow key={r.label}>
                          <TableCell className="text-muted-foreground">{r.label}</TableCell>
                          {watch.map((w, i) => (
                            <TableCell key={w.vehicle.id} className="text-right">
                              <span className={cn('num inline-block rounded-md px-2 py-0.5', vals[i] === bestV && watch.length > 1 && 'bg-pos-muted font-semibold text-pos')}>{r.show(w)}</span>
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Reveal>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Reveal delay={100}>
              <Card className="h-full">
                <CardHeader><CardTitle>Profit across scenarios</CardTitle><CardDescription>Conservative to optimistic net profit; the dot is the expected case.</CardDescription></CardHeader>
                <CardContent><RangeRows format={money} rows={watch.map((w) => ({ name: name(w), cons: w.result.conservative.net, exp: w.result.expected.net, opt: w.result.optimistic.net }))} /></CardContent>
              </Card>
            </Reveal>
            <Reveal delay={160}>
              <Card className="h-full">
                <CardHeader><CardTitle>Verdict</CardTitle></CardHeader>
                <CardContent className="flex h-full flex-col gap-3 text-sm text-muted-foreground">
                  <p>{best ? `${name(best)} leads on expected profit (${money(best.result.expected.net)}). Compare the maximum recommended price in each column before you make an offer.` : ''}</p>
                  {best && <LevelBadge level="g" className="mt-auto h-8 w-full justify-start rounded-lg px-3 text-sm">Best pick: {name(best)}</LevelBadge>}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      )}
    </AppShell>
  );
}
