import { analyze, DEFAULT_RULES, DEFAULT_SETTINGS, DEMO_VEHICLES, MARKET, screen } from './mock';
import type { DealRules, DealsResponse, Item, MarketData, Result, Settings, Vehicle } from './types';

export * from './types';

/** Everything the app needs from the backend. Screens only talk to this. */
export interface FlipPilotApi {
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<Settings>;
  getRules(): Promise<DealRules>;
  saveRules(r: DealRules): Promise<DealRules>;
  analyze(v: Vehicle): Promise<Result>;
  portfolio(): Promise<Item[]>; // all known listings with their analysis
  deals(): Promise<DealsResponse>; // screened by the saved rules
  watchlist(): Promise<string[]>; // vehicle ids
  toggleWatch(id: string): Promise<string[]>;
  saveAnalysis(v: Vehicle): Promise<void>;
  market(): Promise<MarketData>;
}

// ---- Mock (default) --------------------------------------------------------
function createMockApi(): FlipPilotApi {
  let settings = { ...DEFAULT_SETTINGS };
  let rules = { ...DEFAULT_RULES };
  let watch = ['d0', 'd1', 'd3'];
  const saved: Vehicle[] = [];
  const items = (): Item[] => DEMO_VEHICLES.map((vehicle) => ({ vehicle, result: analyze(vehicle, settings) }));
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60));
  return {
    getSettings: () => wait(settings),
    saveSettings: (s) => { settings = s; return wait(settings); },
    getRules: () => wait(rules),
    saveRules: (r) => { rules = r; return wait(rules); },
    analyze: (v) => wait(analyze(v, settings)),
    portfolio: () => wait([...saved.map((vehicle) => ({ vehicle, result: analyze(vehicle, settings) })), ...items()]),
    deals: () => wait(screen(items(), rules)),
    watchlist: () => wait(watch),
    toggleWatch: (id) => { watch = watch.includes(id) ? watch.filter((x) => x !== id) : [...watch, id]; return wait(watch); },
    saveAnalysis: async (v) => { saved.unshift({ ...v, id: 'u' + Date.now(), demo: false }); },
    market: () => wait(MARKET),
  };
}

// ---- HTTP (set EXPO_PUBLIC_API_URL) ----------------------------------------
// Proposed REST contract for the Go backend; adjust paths here once handlers exist.
function createHttpApi(base: string): FlipPilotApi {
  const call = async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await fetch(base.replace(/\/$/, '') + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  };
  return {
    getSettings: () => call('GET', '/v1/settings'),
    saveSettings: (s) => call('PUT', '/v1/settings', s),
    getRules: () => call('GET', '/v1/deal-rules'),
    saveRules: (r) => call('PUT', '/v1/deal-rules', r),
    analyze: (v) => call('POST', '/v1/analyze', v),
    portfolio: () => call('GET', '/v1/portfolio'),
    deals: () => call('GET', '/v1/deals'),
    watchlist: () => call('GET', '/v1/watchlist'),
    toggleWatch: (id) => call('POST', `/v1/watchlist/${encodeURIComponent(id)}/toggle`),
    saveAnalysis: (v) => call('POST', '/v1/analyses', v),
    market: () => call('GET', '/v1/market'),
  };
}

const base = process.env.EXPO_PUBLIC_API_URL;
export const api: FlipPilotApi = base ? createHttpApi(base) : createMockApi();
export const usingMock = !base;
