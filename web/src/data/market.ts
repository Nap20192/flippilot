// Fictional reference resale prices (EUR) per model and country. The backend has no market route yet.
export const MARKET: Record<string, Record<string, number>> = {
  'VW Golf 8 2.0 TDI, 2021': { Germany: 21400, Poland: 21800, Austria: 22900, Netherlands: 23100, Slovakia: 23300, Czechia: 23500 },
  'Škoda Octavia 2.0 TDI, 2020': { Germany: 17400, Poland: 18100, Austria: 18900, Netherlands: 19400, Slovakia: 19200, Czechia: 19600 },
  'BMW 320d xDrive, 2019': { Germany: 21800, Poland: 22400, Austria: 23500, Netherlands: 23700, Slovakia: 23800, Czechia: 24200 },
  'Toyota RAV4 Hybrid, 2020': { Germany: 25900, Poland: 26700, Austria: 27400, Netherlands: 27900, Slovakia: 28100, Czechia: 28600 },
};

export const marketRows = (model: string) =>
  Object.entries(MARKET[model] ?? {}).map(([name, value]) => ({ name, value })).sort((a, b) => a.value - b.value);
