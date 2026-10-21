import { Info, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, type Settings } from '@/api';
import { Reveal } from '@/components/animated';
import { AppShell, PageHeader } from '@/components/app-shell';
import { SimpleSelect } from '@/components/simple-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore } from '@/store';

const CUR = [{ value: 'EUR', label: 'EUR €' }, { value: 'CZK', label: 'CZK Kč' }, { value: 'PLN', label: 'PLN zł' }] as const;
const num = (s: string) => { const v = parseFloat(s.replace(',', '.')); return Number.isFinite(v) ? v : NaN; };

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, user } = useStore();
  const [f, setF] = useState<Record<string, string>>({});
  const [cur, setCur] = useState<Settings['cur']>('EUR');
  const [busy, setBusy] = useState(false);
  const lock = !user;

  useEffect(() => {
    setF({ name: settings.name, target: String(settings.target), reg: String(settings.reg), fees: String(settings.fees), day: String(settings.day), fxCZK: String(settings.fxCZK), fxPLN: String(settings.fxPLN) });
    setCur(settings.cur);
  }, [settings]);
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    const next: Settings = { ...settings, name: f.name ?? '', cur, target: num(f.target), reg: num(f.reg), fees: num(f.fees), day: num(f.day), fxCZK: num(f.fxCZK), fxPLN: num(f.fxPLN) };
    if (![next.target, next.reg, next.fees, next.day, next.fxCZK, next.fxPLN].every(Number.isFinite)) return void toast.error('Enter valid numbers in every field.');
    setBusy(true);
    try {
      await updateSettings(next);
      toast.success('Settings saved', { description: 'Changes apply to the next calculation.' });
    } catch (e) {
      toast.error(e instanceof ApiError ? [e.message, ...e.details].join(' ') : 'Could not save.');
    } finally { setBusy(false); }
  };

  return (
    <AppShell title="Settings">
      <PageHeader title="Settings" description="Profile and calculator defaults. Changes apply on the next calculation." />
      <div className="flex max-w-3xl flex-col gap-5">
        {lock && (
          <Reveal>
            <Alert><Info /><AlertDescription>You’re browsing as a guest. The display currency is saved in this browser; <Link to="/login" className="font-medium text-brand hover:underline">sign in</Link> to change the calculator defaults and keep them on the server.</AlertDescription></Alert>
          </Reveal>
        )}
        <Reveal delay={60}>
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle><CardDescription>{user ? 'Your settings are stored on the FlipPilot server.' : 'Guest profile.'}</CardDescription></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field id="n" label="Display name"><Input id="n" value={f.name ?? ''} onChange={on('name')} disabled={lock} /></Field>
              <Field id="e" label="Email"><Input id="e" value={user?.email ?? ''} disabled placeholder="Not signed in" /></Field>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={120}>
          <Card>
            <CardHeader><CardTitle>Calculator defaults</CardTitle><CardDescription>Used for every analysis. The engine stores EUR internally.</CardDescription></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field id="c" label="Display currency"><SimpleSelect id="c" value={cur} options={CUR} onValueChange={setCur} className="h-9 w-full" /></Field>
              <Field id="t" label="Target ROI (%)" hint="Sets the maximum recommended price."><Input id="t" className="num" inputMode="decimal" value={f.target ?? ''} onChange={on('target')} disabled={lock} /></Field>
              <Field id="r" label="Registration & homologation (€)"><Input id="r" className="num" inputMode="decimal" value={f.reg ?? ''} onChange={on('reg')} disabled={lock} /></Field>
              <Field id="f" label="Fixed fees per deal (€)"><Input id="f" className="num" inputMode="decimal" value={f.fees ?? ''} onChange={on('fees')} disabled={lock} /></Field>
              <Field id="h" label="Holding cost (€/day)"><Input id="h" className="num" inputMode="decimal" value={f.day ?? ''} onChange={on('day')} disabled={lock} /></Field>
              <span className="hidden sm:block" />
              <Field id="x1" label="CZK per €1"><Input id="x1" className="num" inputMode="decimal" value={f.fxCZK ?? ''} onChange={on('fxCZK')} disabled={lock} /></Field>
              <Field id="x2" label="PLN per €1" hint="Currencies use fixed illustrative rates, not live ones."><Input id="x2" className="num" inputMode="decimal" value={f.fxPLN ?? ''} onChange={on('fxPLN')} disabled={lock} /></Field>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={180}>
          <Button size="lg" className="h-10 px-5" onClick={() => void save()} disabled={busy}><Save data-icon="inline-start" />Save changes</Button>
        </Reveal>
      </div>
    </AppShell>
  );
}
