import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, DealRules, DealsResponse, getToken, Item, SavedRow, setToken, Settings, User, Vehicle, WatchRow } from './api';
import { makeMoney } from './format';

export const DEFAULT_SETTINGS: Settings = { name: 'Guest', cur: 'EUR', target: 12, reg: 300, fees: 250, day: 8, fxCZK: 25, fxPLN: 4.3 };
const EMPTY_DEALS: DealsResponse = { capital: null, searched: 0, matches: [], excluded: [] };

type Store = {
  /** auth is optional: without a user the app works as a guest with data kept in this browser */
  user: User | null;
  authReady: boolean;
  login: (email: string, password: string, register?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  ready: boolean;
  error: string | null;
  settings: Settings;
  rules: DealRules;
  items: Item[]; // all demo listings with analysis
  deals: DealsResponse;
  watch: WatchRow[];
  saved: SavedRow[];
  money: (eur: number) => string;
  reload: () => Promise<void>;
  updateSettings: (s: Settings) => Promise<void>;
  updateRules: (r: DealRules) => Promise<void>;
  isWatched: (id: string) => boolean;
  toggleWatch: (v: Vehicle) => Promise<void>;
  saveAnalysis: (v: Vehicle) => Promise<void>;
  /** Vehicle chosen elsewhere (Deals, Dashboard) to open in Analyze. */
  draft: Vehicle | null;
  setDraft: (v: Vehicle | null) => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

type Data = { settings: Settings; rules: DealRules; items: Item[]; deals: DealsResponse; watch: WatchRow[]; saved: SavedRow[] };

// ---- Guest data, kept in this browser -------------------------------------
const GUEST_KEY = 'flippilot.guest';
type Guest = { rules?: DealRules; cur?: Settings['cur']; watch: Vehicle[]; saved: SavedRow[] };
const readGuest = (): Guest => {
  try { return { watch: [], saved: [], ...JSON.parse(localStorage.getItem(GUEST_KEY) ?? '{}') }; } catch { return { watch: [], saved: [] }; }
};
const writeGuest = (g: Guest) => { try { localStorage.setItem(GUEST_KEY, JSON.stringify(g)); } catch { /* private mode */ } };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Vehicle | null>(null);

  const clear = useCallback(() => { setToken(null); setUser(null); setData(null); }, []);

  const loadUser = useCallback(async () => {
    const [settings, rules, items, deals, watch, saved] = await Promise.all([
      api.settings(), api.rules(), api.listings(), api.deals(), api.watchlist(), api.analyses(),
    ]);
    setData({ settings, rules, items, deals, watch, saved });
  }, []);

  const loadGuest = useCallback(async () => {
    const g = readGuest();
    const meta = await api.meta();
    const rules = g.rules ?? meta.defaultDealRules;
    const [items, deals, watchResults] = await Promise.all([
      api.listings(), api.deals(rules), Promise.all(g.watch.map((v) => api.analyze(v).catch(() => null))),
    ]);
    const watch: WatchRow[] = g.watch.flatMap((vehicle, i) => (watchResults[i] ? [{ vehicle, result: watchResults[i]!, note: '', log: [], photo: null, priceChange: 0 }] : []));
    setData({ settings: { ...meta.defaultSettings, name: 'Guest', cur: g.cur ?? meta.defaultSettings.cur }, rules, items, deals, watch, saved: g.saved });
  }, []);

  const reload = useCallback(async () => {
    try {
      await (getToken() ? loadUser() : loadGuest());
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { clear(); return; }
      setError(e instanceof Error ? e.message : 'Could not load data');
    }
  }, [loadUser, loadGuest, clear]);

  // Restore the session if there is one, otherwise continue as a guest.
  useEffect(() => {
    if (!getToken()) { setAuthReady(true); return; }
    api.me().then(setUser).catch(() => clear()).finally(() => setAuthReady(true));
  }, [clear]);
  useEffect(() => { if (authReady) void reload(); }, [authReady, user, reload]);

  const value = useMemo<Store>(() => {
    const settings = data?.settings ?? DEFAULT_SETTINGS;
    const guard = async (fn: () => Promise<unknown>) => {
      try { await fn(); } catch (e) { if (e instanceof ApiError && e.status === 401) { clear(); return; } throw e; }
      await reload();
    };
    const guest = (fn: (g: Guest) => void) => async () => { const g = readGuest(); fn(g); writeGuest(g); await reload(); };
    return {
      user, authReady,
      login: async (email, password, register) => {
        const r = register ? await api.register(email, password) : await api.login(email, password);
        setToken(r.token);
        setUser(r.user);
      },
      logout: async () => { await api.logout(); clear(); },
      ready: !!data, error, settings,
      rules: data?.rules ?? ({} as DealRules),
      items: data?.items ?? [],
      deals: data?.deals ?? EMPTY_DEALS,
      watch: data?.watch ?? [],
      saved: data?.saved ?? [],
      money: makeMoney(settings),
      reload,
      updateSettings: (s) => (user ? guard(() => api.saveSettings(s)) : guest((g) => { g.cur = s.cur; })()),
      updateRules: (r) => (user ? guard(() => api.saveRules(r)) : guest((g) => { g.rules = r; })()),
      isWatched: (id) => !!data?.watch.some((w) => w.vehicle.id === id),
      toggleWatch: (v) => {
        if (user) return guard(() => (data?.watch.some((w) => w.vehicle.id === v.id) ? api.removeWatch(v.id) : api.addWatch(v.demo ? { id: v.id } : v)));
        return guest((g) => { g.watch = g.watch.some((x) => x.id === v.id) ? g.watch.filter((x) => x.id !== v.id) : [...g.watch, v.id ? v : { ...v, id: 'u' + Date.now() }]; })();
      },
      saveAnalysis: (v) => (user
        ? guard(() => api.saveAnalysis(v))
        : guest((g) => { g.saved = [{ vehicle: { ...v, id: 'u' + Date.now(), demo: false }, savedAt: new Date().toISOString(), photo: null }, ...g.saved].slice(0, 20); })()),
      draft, setDraft,
    };
  }, [user, authReady, data, error, reload, clear, draft]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
