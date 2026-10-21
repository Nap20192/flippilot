// In-memory stand-in for the Go backend. Replace by the HTTP client in ./index.ts.
import type { Case, DealRules, DealsResponse, Flag, Item, MarketData, Result, Settings, Vehicle } from './types';

const TR: Record<string, number> = { DE: 450, AT: 550, NL: 750, BE: 700, PL: 500 };
const CB = { Excellent: 0, Good: 350, Fair: 1100, Poor: 2600 };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const RAW: [string, string, number, number, string, string, Vehicle['cond'], string, number, number, string][] = [
  ['Volkswagen', 'Golf 8 2.0 TDI', 2021, 62000, 'Diesel', 'Manual', 'Good', 'DE', 17900, 21400, 'Two owners, full service history.'],
  ['Škoda', 'Octavia Combi 2.0 TDI', 2020, 98000, 'Diesel', 'Automatic', 'Good', 'DE', 15200, 18600, 'Regular dealer servicing.'],
  ['BMW', '320d xDrive', 2019, 121000, 'Diesel', 'Automatic', 'Good', 'DE', 19800, 22900, 'M Sport package, one owner.'],
  ['Audi', 'A4 Avant 40 TDI', 2020, 88000, 'Diesel', 'Automatic', 'Excellent', 'DE', 22400, 25600, 'Matrix LED, virtual cockpit.'],
  ['Toyota', 'RAV4 Hybrid', 2020, 74000, 'Hybrid', 'Automatic', 'Good', 'DE', 23900, 27200, 'Toyota service book complete.'],
  ['Mercedes-Benz', 'C 220 d', 2018, 168000, 'Diesel', 'Automatic', 'Fair', 'DE', 16700, 19300, 'Minor Unfall repaired, invoice available.'],
  ['SEAT', 'Leon 1.5 TSI', 2021, 51000, 'Petrol', 'Manual', 'Excellent', 'AT', 15900, 18400, 'Garage kept.'],
  ['Hyundai', 'Tucson 1.6 T-GDI', 2021, 59000, 'Petrol', 'Automatic', 'Good', 'NL', 20400, 22100, 'Dealer warranty until 2027.'],
  ['Ford', 'Focus ST-Line 1.0', 2019, 134000, 'Petrol', 'Manual', 'Fair', 'DE', 9800, 12400, 'Some paint wear, new tyres.'],
  ['Volkswagen', 'Passat Variant 2.0 TDI', 2017, 214000, 'Diesel', 'Automatic', 'Poor', 'DE', 8900, 11800, 'Engine noise, no service book, export only.'],
  ['Škoda', 'Superb 2.0 TDI', 2021, 77000, 'Diesel', 'Automatic', 'Good', 'DE', 24100, 26800, 'Laurin & Klement trim.'],
  ['Opel', 'Astra 1.2 Turbo', 2022, 33000, 'Petrol', 'Manual', 'Excellent', 'DE', 15600, 17400, 'First owner, factory warranty.'],
];

export const DEMO_VEHICLES: Vehicle[] = RAW.map((a, i) => ({
  id: 'd' + i, make: a[0], model: a[1], year: a[2], km: a[3], engine: a[4], trans: a[5], cond: a[6],
  country: a[7], price: a[8], resale: a[9], desc: a[10], days: 45, transport: null, repairs: null, demo: true,
}));

export const MARKET: MarketData = {
  'VW Golf 8 2.0 TDI, 2021': { Germany: 21400, Poland: 21800, Austria: 22900, Netherlands: 23100, Slovakia: 23300, Czechia: 23500 },
  'Škoda Octavia 2.0 TDI, 2020': { Germany: 17400, Poland: 18100, Austria: 18900, Netherlands: 19400, Slovakia: 19200, Czechia: 19600 },
  'BMW 320d xDrive, 2019': { Germany: 21800, Poland: 22400, Austria: 23500, Netherlands: 23700, Slovakia: 23800, Czechia: 24200 },
  'Toyota RAV4 Hybrid, 2020': { Germany: 25900, Poland: 26700, Austria: 27400, Netherlands: 27900, Slovakia: 28100, Czechia: 28600 },
};

export const DEFAULT_SETTINGS: Settings = { name: 'Demo user', cur: 'EUR', target: 12, reg: 300, fees: 250, day: 8, fxCZK: 25, fxPLN: 4.3 };
export const DEFAULT_RULES: DealRules = {
  capital: 30000, reservePct: 15, minPositionPct: 10, maxPositionPct: 90,
  minProfit: 500, minMargin: 3, minROI: 3, maxLoss: 1200, maxRisk: 'Medium',
};

export function analyze(v: Vehicle, s: Settings): Result {
  const price = v.price, age = 2026 - v.year, km = v.km;
  const T = v.transport == null ? TR[v.country] ?? 600 : v.transport;
  const est = !(v.resale > 0);
  const resale = est ? price * 1.14 : v.resale;
  const auto = CB[v.cond] + (km / 1000) * 3.5 + age * 45;
  const rep = v.repairs == null ? auto : v.repairs;
  const days = v.days || 45;
  const run = (rs: number, rm: number, dm: number): Case => {
    const r = resale * rs, rp = rep * rm, hold = days * dm * s.day, fees = s.fees + r * 0.02;
    const cost = price + T + s.reg + rp + hold + fees, net = r - cost;
    return { resale: r, repairs: rp, hold, fees, cost, net, roi: cost ? net / cost : 0 };
  };
  const e = run(1, 1, 1), c = run(0.94, 1.4, 1.5), o = run(1.04, 0.8, 0.7);
  const maxPrice = e.resale / (1 + s.target / 100) - (T + s.reg + e.repairs + e.hold + e.fees);

  const risk: Flag[] = [];
  let pts = 0;
  const add = (p: number, level: Flag['level'], text: string) => { pts += p; risk.push({ level, text }); };
  if (km > 200000) add(6, 'r', `Very high mileage (${km.toLocaleString('en-US')} km): drivetrain wear risk`);
  else if (km > 150000) add(3, 'a', 'High mileage: budget extra for wear parts');
  if (age > 12) add(5, 'r', `Vehicle is ${age} years old`);
  else if (age > 8) add(2, 'a', `Vehicle is ${age} years old`);
  if (v.cond === 'Poor') add(6, 'r', 'Poor condition: repair estimate is uncertain');
  else if (v.cond === 'Fair') add(3, 'a', 'Fair condition: inspect before buying');
  if (price && e.repairs / price > 0.15) add(4, 'a', `Repairs are ${(e.repairs / price * 100).toFixed(1)}% of the purchase price`);
  if (/unfall|accident|damage|schaden|bastler|defekt|noise|rust|no service|export/i.test(v.desc || ''))
    add(6, 'r', 'Description contains a warning term (damage, noise, export or missing service)');
  if (est) add(3, 'a', 'Resale price is a model estimate: verify against local listings');
  if (e.roi < 0.08) add(3, 'a', 'Thin margin: small price moves erase the profit');
  if (!risk.length) risk.push({ level: 'g', text: 'No major risk flags found' });

  const score = Math.round(clamp(e.roi / 0.25, 0, 1) * 50 + clamp((c.roi + 0.1) / 0.15, 0, 1) * 25 + 25 - Math.min(25, pts));
  const riskLevel = pts < 8 ? { label: 'Low', level: 'g' as const } : pts < 16 ? { label: 'Medium', level: 'a' as const } : { label: 'High', level: 'r' as const };
  const verdict =
    score >= 85 ? { label: 'Excellent potential', level: 'g' as const } :
    score >= 70 ? { label: 'Good potential', level: 'g' as const } :
    score >= 50 ? { label: 'Average', level: 'b' as const } :
    score >= 30 ? { label: 'High caution', level: 'a' as const } : { label: 'Poor opportunity', level: 'r' as const };
  return {
    insufficient: !(price > 0), resale: e.resale, transport: T, registration: s.reg, days, maxPrice,
    expected: e, conservative: c, optimistic: o, risk, riskPoints: pts, riskLevel, score, verdict,
  };
}

export function screen(items: Item[], b: DealRules): DealsResponse {
  const deployable = b.capital * (1 - b.reservePct / 100);
  const min = (deployable * b.minPositionPct) / 100, max = (deployable * b.maxPositionPct) / 100;
  const rank = { Low: 0, Medium: 1, High: 2 } as const;
  const out: DealsResponse = { matches: [], excluded: [] };
  for (const it of items) {
    const { expected: e, conservative: c, riskLevel } = it.result, reasons: string[] = [];
    const margin = e.resale ? (100 * e.net) / e.resale : 0;
    if (e.cost < min - 0.005) reasons.push('Below minimum position size');
    if (e.cost > max + 0.005) reasons.push('All-in cost exceeds allocation cap');
    if (e.net < b.minProfit) reasons.push('Expected profit below target');
    if (margin < b.minMargin) reasons.push('Resale profit margin below target');
    if (e.roi * 100 < b.minROI) reasons.push('ROI below target');
    if (Math.max(0, -c.net) > b.maxLoss) reasons.push('Conservative-case loss above limit');
    if ((rank[riskLevel.label as keyof typeof rank] ?? 3) > rank[b.maxRisk]) reasons.push('Risk level above allowance');
    if (reasons.length) out.excluded.push({ ...it, reasons });
    else out.matches.push(it);
  }
  out.matches.sort((a, b2) => b2.result.score - a.result.score);
  return out;
}
