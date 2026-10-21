import { LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api';
import { Logo } from '@/components/logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/store';
import { toast } from 'sonner';

export default function LoginPage() {
  const { user, login, authReady } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>(new URLSearchParams(loc.search).get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const from = (loc.state as { from?: string } | null)?.from ?? '/app';

  if (authReady && user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await login(email.trim(), password, mode === 'register');
      toast.success(mode === 'register' ? 'Account created' : 'Welcome back');
      nav(from, { replace: true });
    } catch (err) {
      setErrors(err instanceof ApiError ? (err.details.length ? err.details : [err.message]) : ['Something went wrong. Try again.']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-muted/40 p-4">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl animate-in fade-in-0 duration-1000" />
      <Link to="/" aria-label="FlipPilot home" className="relative flex items-center gap-2.5 text-xl font-bold tracking-tight animate-in fade-in-0 slide-in-from-top-3 duration-500">
        <Logo size={36} />FlipPilot
      </Link>
      <Card className="relative w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-6 duration-700 fill-mode-both">
        <CardHeader>
          <Tabs value={mode} onValueChange={(v) => { setMode(v as typeof mode); setErrors([]); }} className="mb-2">
            <TabsList className="w-full"><TabsTrigger value="login">Sign in</TabsTrigger><TabsTrigger value="register">Create account</TabsTrigger></TabsList>
          </Tabs>
          <CardTitle className="text-xl">{mode === 'register' ? 'Create your account' : 'Sign in to FlipPilot'}</CardTitle>
          <CardDescription>{mode === 'register' ? 'Save analyses, build a watchlist and set your trading strategy.' : 'Welcome back. Enter your email and password.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-10" />
              {mode === 'register' && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
            </div>
            {errors.length > 0 && <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-1"><AlertDescription>{errors.join(' ')}</AlertDescription></Alert>}
            <Button type="submit" size="lg" className="h-10" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
              {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="relative text-center text-xs leading-relaxed text-muted-foreground">
        <Link to="/app" className="font-medium text-brand hover:underline">Continue without an account</Link><br />
        Demo listings and prices are fictional, not live marketplace data.
      </p>
    </div>
  );
}
