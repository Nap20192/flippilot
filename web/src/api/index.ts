import type { Capital, DealRules, DealsResponse, Item, Photo, Result, SavedRow, Settings, User, Vehicle, WatchRow } from './types';

export * from './types';

/** Backend base URL. Empty = same origin ("/api" is proxied by Vite in dev). */
export const API_BASE: string = ((import.meta as any).env.VITE_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'flippilot.token';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public details: string[] = []) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details ?? []);
  return data as T;
}

export const photoSrc = (p: Photo | null | undefined, thumb = true) => (p ? API_BASE + (thumb ? p.thumbUrl : p.url) : null);

// ---- Mapping backend rows to the shapes the pages use ----------------------
type Analyzed = { vehicle: Vehicle; analysis: Result; reasons?: string[] };
const toItem = (a: Analyzed): Item => ({ vehicle: a.vehicle, result: a.analysis });
type RawDeals = { capital: Capital | null; searched: number; matches: Analyzed[]; excluded: Analyzed[] };

const VEHICLE_KEYS = ['id', 'make', 'model', 'year', 'km', 'engine', 'trans', 'cond', 'country', 'dst', 'price', 'resale', 'transport', 'repairs', 'days', 'desc', 'url', 'accident', 'service', 'vin', 'demo'] as const;
const pickVehicle = (row: Record<string, unknown>): Vehicle => {
  const v: Record<string, unknown> = {};
  for (const k of VEHICLE_KEYS) v[k] = row[k];
  return v as unknown as Vehicle;
};

export const api = {
  // auth
  register: (email: string, password: string) => call<{ token: string; user: User }>('POST', '/api/auth/register', { email, password }),
  login: (email: string, password: string) => call<{ token: string; user: User }>('POST', '/api/auth/login', { email, password }),
  logout: () => call<void>('POST', '/api/auth/logout').catch(() => undefined),
  me: () => call<User>('GET', '/api/me'),

  // calculations (work without a token too)
  analyze: (v: Vehicle) => call<Result>('POST', '/api/analyze', v),
  listings: async () => (await call<{ items: Analyzed[] }>('GET', '/api/listings')).items.map(toItem),
  meta: () => call<{ defaultSettings: Settings; defaultDealRules: DealRules }>('GET', '/api/meta'),
  /** Screens the demo listings; pass rules to use a strategy that isn't saved on the server (guests). */
  deals: async (rules?: DealRules): Promise<DealsResponse> => {
    const r = await (rules ? call<RawDeals>('POST', '/api/deals/screen', { rules }) : call<RawDeals>('GET', '/api/deals'));
    return {
      capital: r.capital ?? null,
      searched: r.searched,
      matches: r.matches.map(toItem),
      excluded: r.excluded.map((x) => ({ ...toItem(x), reasons: x.reasons ?? [] })),
    };
  },

  // user data
  settings: () => call<Settings>('GET', '/api/settings'),
  saveSettings: (s: Settings) => call<Settings>('PUT', '/api/settings', s),
  rules: async () => (await call<{ rules: DealRules }>('GET', '/api/deal-rules')).rules,
  saveRules: async (r: DealRules) => (await call<{ rules: DealRules }>('PUT', '/api/deal-rules', r)).rules,

  watchlist: async (): Promise<WatchRow[]> => {
    const rows = await call<(Record<string, unknown> & { analysis: Result; note: string; log: WatchRow['log'] | null; photo: Photo | null; priceChange: number })[]>('GET', '/api/watchlist');
    return rows.map((r) => ({ vehicle: pickVehicle(r), result: r.analysis, note: r.note ?? '', log: r.log ?? [], photo: r.photo ?? null, priceChange: r.priceChange ?? 0 }));
  },
  addWatch: (v: Vehicle | { id: string }) => call<Vehicle>('POST', '/api/watchlist', v),
  removeWatch: (id: string) => call<void>('DELETE', `/api/watchlist/${encodeURIComponent(id)}`),
  noteWatch: (id: string, note: string) => call<void>('PATCH', `/api/watchlist/${encodeURIComponent(id)}`, { note }),
  logPrice: (id: string, p: number) => call<{ d: string; p: number }>('POST', `/api/watchlist/${encodeURIComponent(id)}/prices`, { p }),

  analyses: async (): Promise<SavedRow[]> => {
    const rows = await call<(Record<string, unknown> & { savedAt: string; photo: Photo | null; vehicleId: string })[]>('GET', '/api/analyses');
    return rows.map((r) => ({ vehicle: { ...pickVehicle(r), id: r.vehicleId ?? (r.id as string) }, savedAt: r.savedAt, photo: r.photo ?? null }));
  },
  saveAnalysis: (v: Vehicle) => call<Vehicle>('POST', '/api/analyses', v),
  deleteAnalysis: (id: string) => call<void>('DELETE', `/api/analyses/${encodeURIComponent(id)}`),

  // photos
  photos: (vehicleId: string) => call<Photo[]>('GET', `/api/vehicles/${encodeURIComponent(vehicleId)}/photos`),
  uploadPhotos: (vehicleId: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    return call<{ photos: Photo[]; rejected: { file: string; error: string }[] }>('POST', `/api/vehicles/${encodeURIComponent(vehicleId)}/photos`, fd);
  },
  setMainPhoto: (id: string) => call<void>('PUT', `/api/photos/${id}/main`),
  deletePhoto: (id: string) => call<void>('DELETE', `/api/photos/${id}`),
};
