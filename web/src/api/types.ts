// JSON shapes of the Go backend (backend/internal/domain, backend/internal/analysis).
export type Level = 'g' | 'a' | 'r' | 'b';
export type Labeled = { label: string; level: Level };
export type Flag = { level: Level; text: string };

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  km: number;
  engine: string;
  trans: string;
  cond: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  country: string;
  dst?: string;
  price: number;
  resale: number; // 0 = unknown, the backend estimates it
  transport?: number | null;
  repairs?: number | null;
  days: number;
  desc: string;
  url?: string;
  accident?: string;
  service?: string;
  vin?: string;
  demo?: boolean;
};

export type Case = { resale: number; repairs: number; hold: number; fees: number; cost: number; net: number; roi: number };

export type Comp = { make: string; model: string; year: number; km: number; engine: string; price: number; source: string; similarity: number; adjusted: number };

export type Result = {
  insufficient: boolean;
  resaleFromComps: boolean;
  compsMedian: number;
  comps: Comp[] | null;
  resale: number;
  transport: number;
  registration: number;
  days: number;
  maxPrice: number;
  expected: Case;
  conservative: Case;
  optimistic: Case;
  risk: Flag[];
  riskPoints: number;
  riskLevel: Labeled;
  score: number;
  verdict: Labeled;
  missing: string[] | null;
  confidence: number;
  confidenceLevel: Labeled;
  recommendation: Labeled;
};

export type Settings = {
  name: string;
  cur: 'EUR' | 'CZK' | 'PLN';
  target: number;
  reg: number;
  fees: number;
  day: number;
  fxCZK: number;
  fxPLN: number;
};

export type DealRules = {
  capital: number;
  reservePct: number;
  minPositionPct: number;
  maxPositionPct: number;
  minProfit: number;
  minMargin: number;
  minROI: number;
  maxLoss: number;
  maxRisk: 'Low' | 'Medium' | 'High';
};

export type Photo = { id: string; vehicleId: string; width: number; height: number; main: boolean; url: string; thumbUrl: string };
export type PriceLog = { d: string; p: number };
export type User = { id: number; email: string };

/** A vehicle with its backend analysis. */
export type Item = { vehicle: Vehicle; result: Result };
export type WatchRow = Item & { note: string; log: PriceLog[]; photo: Photo | null; priceChange: number };
export type SavedRow = { vehicle: Vehicle; savedAt: string; photo: Photo | null };
export type Capital = { capital: number; reserve: number; deployable: number; min: number; max: number };
export type DealsResponse = { capital: Capital | null; searched: number; matches: Item[]; excluded: (Item & { reasons: string[] })[] };
