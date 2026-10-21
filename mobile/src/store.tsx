import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, DealRules, DealsResponse, Item, MarketData, Settings, Vehicle } from './api';
import { makeMoney } from './format';

type Store = {
  ready: boolean;
  error: string | null;
  settings: Settings;
  rules: DealRules;
  items: Item[];
  deals: DealsResponse;
  watch: string[];
  market: MarketData;
  money: (eur: number) => string;
  reload: () => Promise<void>;
  updateSettings: (s: Settings) => Promise<void>;
  updateRules: (r: DealRules) => Promise<void>;
  toggleWatch: (id: string) => Promise<void>;
  saveAnalysis: (v: Vehicle) => Promise<void>;
  /** Vehicle chosen elsewhere (Deals, Home) to open in Analyze. */
  draft: Vehicle | null;
  setDraft: (v: Vehicle | null) => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

const EMPTY_SETTINGS: Settings = { name: '', cur: 'EUR', target: 12, reg: 300, fees: 250, day: 8, fxCZK: 25, fxPLN: 4.3 };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Pick<Store, 'settings' | 'rules' | 'items' | 'deals' | 'watch' | 'market'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Vehicle | null>(null);

  const reload = useCallback(async () => {
    try {
      const [settings, rules, items, deals, watch, market] = await Promise.all([
        api.getSettings(), api.getRules(), api.portfolio(), api.deals(), api.watchlist(), api.market(),
      ]);
      setState({ settings, rules, items, deals, watch, market });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server');
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const value = useMemo<Store>(() => {
    const settings = state?.settings ?? EMPTY_SETTINGS;
    return {
      ready: !!state, error, settings,
      rules: state?.rules ?? ({} as DealRules),
      items: state?.items ?? [],
      deals: state?.deals ?? { matches: [], excluded: [] },
      watch: state?.watch ?? [],
      market: state?.market ?? {},
      money: makeMoney(settings),
      reload,
      updateSettings: async (s) => { await api.saveSettings(s); await reload(); },
      updateRules: async (r) => { await api.saveRules(r); await reload(); },
      toggleWatch: async (id) => { await api.toggleWatch(id); await reload(); },
      saveAnalysis: async (v) => { await api.saveAnalysis(v); await reload(); },
      draft, setDraft,
    };
  }, [state, error, reload, draft]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
