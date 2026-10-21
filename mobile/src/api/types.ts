// Mirrors backend/internal/domain and backend/internal/analysis JSON shapes.
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
  resale: number; // 0 = unknown, estimate
  transport?: number | null;
  repairs?: number | null;
  days: number;
  desc: string;
  url?: string;
  demo?: boolean;
};

export type Case = {
  resale: number;
  repairs: number;
  hold: number;
  fees: number;
  cost: number;
  net: number;
  roi: number;
};

export type Result = {
  insufficient: boolean;
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

export type Item = { vehicle: Vehicle; result: Result };
export type DealsResponse = { matches: Item[]; excluded: (Item & { reasons: string[] })[] };
export type MarketData = Record<string, Record<string, number>>;
