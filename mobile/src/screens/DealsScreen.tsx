import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { DealRules, Item } from '../api';
import { pct } from '../format';
import { useLayout } from '../layout';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Badge, Btn, Card, Field, Segmented, Txt } from '../ui';
import { Screen } from './Screen';

const RISKS = ['Low', 'Medium', 'High'] as const;
const n = (s: string) => { const v = parseFloat(s); return Number.isFinite(v) ? v : NaN; };

export function DealsScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { desktop } = useLayout();
  const { rules, updateRules, deals, items, money, setDraft } = useStore();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [maxRisk, setMaxRisk] = useState<DealRules['maxRisk']>('Medium');
  const [err, setErr] = useState('');
  const [showOut, setShowOut] = useState(false);

  useEffect(() => {
    if (rules.capital == null) return;
    setF({ capital: String(rules.capital), reservePct: String(rules.reservePct), minProfit: String(rules.minProfit), minROI: String(rules.minROI), maxLoss: String(rules.maxLoss) });
    setMaxRisk(rules.maxRisk);
  }, [rules]);

  const deployable = rules.capital * (1 - rules.reservePct / 100);
  const apply = () => {
    const next: DealRules = { ...rules, capital: n(f.capital), reservePct: n(f.reservePct), minProfit: n(f.minProfit), minROI: n(f.minROI), maxLoss: n(f.maxLoss), maxRisk };
    if (![next.capital, next.reservePct, next.minProfit, next.minROI, next.maxLoss].every(Number.isFinite)) return setErr('Complete every field with a valid number.');
    if (!(next.capital > 0)) return setErr('Capital must be greater than zero.');
    if (next.reservePct < 0 || next.reservePct >= 100) return setErr('Reserve must be between 0% and 99%.');
    if (next.minProfit < 0 || next.minROI < 0 || next.maxLoss < 0) return setErr('Profit, ROI and loss limits cannot be negative.');
    setErr('');
    void updateRules(next);
  };
  const setField = (k: string) => (t: string) => setF({ ...f, [k]: t });

  const open_ = (i: Item) => { setDraft(i.vehicle); navigation.navigate('Analyze'); };

  return (
    <Screen sub="Which vehicles fit your capital, profit targets and downside limits.">
      <Card style={{ gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt w="semibold">Budget & risk manager</Txt>
          <Txt size={13} color={theme.blue} w="medium">{open ? 'Hide' : 'Edit'}</Txt>
        </Pressable>
        <View style={{ height: 8, borderRadius: 99, backgroundColor: theme.muted, flexDirection: 'row', overflow: 'hidden' }}>
          <View style={{ width: `${rules.reservePct}%`, backgroundColor: theme.mfg, opacity: 0.4 }} />
          <View style={{ flex: 1, backgroundColor: theme.fg }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt size={12} muted>Capital <Txt size={12} mono color={theme.fg}>{money(rules.capital)}</Txt></Txt>
          <Txt size={12} muted>Per car ≤ <Txt size={12} mono color={theme.fg}>{money(deployable * rules.maxPositionPct / 100)}</Txt></Txt>
        </View>
        {open && (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Capital (€)" value={f.capital ?? ''} onChangeText={setField('capital')} /><Field numeric label="Reserve (%)" value={f.reservePct ?? ''} onChangeText={setField('reservePct')} /></View>
            <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Min. profit (€)" value={f.minProfit ?? ''} onChangeText={setField('minProfit')} /><Field numeric label="Min. ROI (%)" value={f.minROI ?? ''} onChangeText={setField('minROI')} /></View>
            <Field numeric label="Max. conservative loss (€)" value={f.maxLoss ?? ''} onChangeText={setField('maxLoss')} />
            <View style={{ gap: 6 }}><Txt size={13} w="medium">Maximum risk rating</Txt><Segmented value={maxRisk} options={RISKS} onChange={setMaxRisk} /></View>
            {err ? <Txt size={13} color={theme.neg}>{err}</Txt> : null}
            <Btn label="Apply strategy" onPress={apply} />
          </View>
        )}
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt size={16} w="semibold">{deals.matches.length} suitable {deals.matches.length === 1 ? 'deal' : 'deals'}</Txt>
        <Txt size={12} muted>{deals.excluded.length} screened out of {items.length}</Txt>
      </View>

      {deals.matches.length === 0 && (
        <Card><Txt size={13} muted>No deals satisfy these limits. Try a lower profit requirement, a larger per-car allocation or a higher risk allowance.</Txt></Card>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {deals.matches.map((i) => (
        <Pressable key={i.vehicle.id} accessibilityRole="button" onPress={() => open_(i)} style={{ width: desktop ? '32%' : '100%', minWidth: desktop ? 300 : undefined, flexGrow: 1 }}>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Txt w="semibold" lines={1}>{i.vehicle.make} {i.vehicle.model}</Txt>
                <Txt size={12} muted>{i.vehicle.year} · {i.vehicle.km.toLocaleString('en-US')} km · {i.vehicle.country}</Txt>
              </View>
              <Badge label={`Score ${i.result.score}`} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              {[['All-in', money(i.result.expected.cost), undefined], ['Profit', money(i.result.expected.net), theme.pos], ['ROI', pct(i.result.expected.roi), undefined]].map(([l, v, c]) => (
                <View key={l as string} style={{ flex: 1 }}><Txt size={11} muted>{l}</Txt><Txt mono w="semibold" color={c as string | undefined}>{v}</Txt></View>
              ))}
            </View>
          </Card>
        </Pressable>
      ))}
      </View>

      {deals.excluded.length > 0 && (
        <Card pad={0}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showOut }} onPress={() => setShowOut(!showOut)} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt w="medium">Why were {deals.excluded.length} listings excluded?</Txt>
            <Txt muted>{showOut ? '−' : '+'}</Txt>
          </Pressable>
          {showOut && deals.excluded.map((x) => (
            <View key={x.vehicle.id} style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt w="medium" lines={1} style={{ flex: 1 }}>{x.vehicle.make} {x.vehicle.model}</Txt>
                <Txt size={12} mono color={x.result.expected.net >= 0 ? theme.pos : theme.neg}>{money(x.result.expected.net)}</Txt>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{x.reasons.map((r) => <Badge key={r} label={r} />)}</View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
