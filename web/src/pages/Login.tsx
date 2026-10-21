import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { Logo } from '../components/Shell';
import { useStore } from '../store';
import './Login.css';

export default function Login() {
  const { user, login, authReady } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [register, setRegister] = useState(new URLSearchParams(loc.search).get('mode') === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const from = (loc.state as { from?: string } | null)?.from ?? '/app';

  if (authReady && user) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      await login(email.trim(), password, register);
      nav(from, { replace: true });
    } catch (err) {
      setErrors(err instanceof ApiError ? (err.details.length ? err.details : [err.message]) : ['Something went wrong. Try again.']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pg-login">
      <a href="/" className="brand" aria-label="FlipPilot home"><Logo size={34} /><span>FlipPilot</span></a>
      <form className="box" onSubmit={submit} noValidate>
        <h1>{register ? 'Create your account' : 'Sign in to FlipPilot'}</h1>
        <p className="sub">{register ? 'Save analyses, build a watchlist and set your trading strategy.' : 'Welcome back. Enter your email and password.'}</p>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {register && <p className="hint">At least 8 characters.</p>}
        {errors.length > 0 && <div className="err" role="alert">{errors.join(' ')}</div>}
        <button className="submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
        <p className="switch">
          {register ? 'Already have an account?' : 'New to FlipPilot?'}{' '}
          <button type="button" onClick={() => { setRegister(!register); setErrors([]); }}>{register ? 'Sign in' : 'Create an account'}</button>
        </p>
      </form>
      <p className="foot"><a href="/app" style={{ color: 'var(--blue)', fontWeight: 500 }}>Continue without an account</a><br />Demo listings and prices are fictional, not live marketplace data.</p>
    </div>
  );
}
