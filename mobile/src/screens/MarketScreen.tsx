import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { rateOf } from '../format';
import { useLayout } from '../layout';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Badge, Card, Row, Txt } from '../ui';
import { Screen } from './Screen';

export function MarketScreen() {
  const { theme } = useTheme();
  const { market, money, settings } = useStore();
  const keys = Object.keys(market);
  const [sel, setSel] = useState(0);
  const d = market[keys[sel]];

  return (
    <Screen sub="Reference prices for the same vehicle across countries.">
      <Badge label="Fictional demo reference prices" tone="warn" />
      {d && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {keys.map((k, i) => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: i === sel }} onPress={() => setSel(i)}
                style={{ height: 36, paddingHorizontal: 14, borderRadius: 99, justifyContent: 'center', backgroundColor: i === sel ? theme.primary : theme.card, borderWidth: 1, borderColor: i === sel ? theme.primary : theme.border }}>
                <Txt size={13} w="medium" color={i === sel ? theme.pfg : theme.fg}>{k.split(',')[0]}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Body d={d} money={money} rate={rateOf(settings)} />
        </>
      )}
    </Screen>
  );
}

function Body({ d, money }: { d: Record<string, number>; money: (v: number) => string; rate: number }) {
  const { theme } = useTheme();
  const { desktop } = useLayout();
  const e = Object.entries(d).sort((a, b) => a[1] - b[1]);
  const lo = e[0][1], hi = e[e.length - 1][1];
  const spread = (d.Czechia ?? hi) - (d.Germany ?? lo);
  return (
    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
      <Card style={{ gap: 14, flex: desktop ? 1.3 : undefined, width: desktop ? undefined : '100%' }}>
        <Txt w="semibold">Resale price by country</Txt>
        {e.map(([c, p]) => (
          <View key={c} style={{ gap: 6 }} accessible accessibilityLabel={`${c} ${money(p)}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt size={13} w="medium">{c}</Txt><Txt size={13} mono>{money(p)}</Txt></View>
            <View style={{ height: 10, borderRadius: 99, backgroundColor: theme.muted, overflow: 'hidden' }}>
              <View style={{ height: 10, borderRadius: 99, width: `${45 + ((p - lo) / (hi - lo || 1)) * 55}%`, backgroundColor: p === lo ? theme.pos : p === hi ? theme.blue : theme.mfg, opacity: p === lo || p === hi ? 1 : 0.45 }} />
            </View>
          </View>
        ))}
        <Txt size={11} muted>Cheapest market in green, most expensive in blue.</Txt>
      </Card>
      <Card style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%' }}>
        <Txt size={12} muted>Germany → Czechia gross spread</Txt>
        <Txt size={34} mono w="semibold" color={spread >= 0 ? theme.pos : theme.neg} style={{ letterSpacing: -1.2 }}>{money(spread)}</Txt>
        <Row label="Transport DE → CZ" value={money(450)} />
        <Row label="Registration" value={money(300)} />
        <Row label="Left after fixed costs" value={money(spread - 750)} bold last />
      </Card>
    </View>
  );
}
