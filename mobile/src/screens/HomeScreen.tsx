import React from 'react';
import { Pressable, View } from 'react-native';
import { ProfitBars } from '../charts';
import { pct, rateOf } from '../format';
import { useLayout } from '../layout';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Badge, Btn, Card, Txt } from '../ui';
import { Screen } from './Screen';

export function HomeScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { desktop } = useLayout();
  const { items, watch, money, settings, deals, setDraft } = useStore();
  const profitable = items.filter((i) => i.result.expected.net > 0);
  const avgRoi = items.length ? items.reduce((s, i) => s + i.result.expected.roi, 0) / items.length : 0;
  const top = [...items].sort((a, b) => b.result.score - a.result.score).slice(0, 4);
  const bars = [...items].sort((a, b) => b.result.expected.net - a.result.expected.net).slice(0, 8)
    .map((i) => ({ name: i.vehicle.model.split(' ')[0], v: i.result.expected.net * rateOf(settings) }));

  const kpi = (label: string, value: string, tone?: string, sub?: string) => (
    <Card style={{ width: desktop ? '24%' : '48.5%', flexGrow: 1, gap: 4 }} pad={14}>
      <Txt size={12} muted>{label}</Txt>
      <Txt size={22} mono w="semibold" color={tone} style={{ letterSpacing: -0.5 }}>{value}</Txt>
      {sub ? <Txt size={11} muted>{sub}</Txt> : null}
    </Card>
  );

  return (
    <Screen sub="Your pipeline at a glance. Demo data: fictional listings.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {kpi('Analyzed', String(items.length), undefined, 'listings')}
        {kpi('Saved', String(watch.length), undefined, 'on your watchlist')}
        {kpi('Est. profit', money(profitable.reduce((s, i) => s + i.result.expected.net, 0)), theme.pos, `${profitable.length} deals in profit`)}
        {kpi('Average ROI', pct(avgRoi), avgRoi >= 0 ? theme.pos : theme.neg, `${deals.matches.length} pass your strategy`)}
      </View>

      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
      <Card style={{ gap: 12, flex: desktop ? 1.2 : undefined, width: desktop ? undefined : '100%' }}>
        <View>
          <Txt w="semibold">Expected profit by vehicle</Txt>
          <Txt size={12} muted>Top 8, in {settings.cur}. Dashed line is the zero baseline.</Txt>
        </View>
        <ProfitBars data={bars} height={desktop ? 300 : 210} format={(v) => money(v / rateOf(settings))} />
      </Card>

      <Card pad={0} style={{ flex: desktop ? 1 : undefined, width: desktop ? undefined : '100%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 6 }}>
          <Txt w="semibold">Top deals</Txt>
          <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Deals')} hitSlop={10}><Txt size={13} color={theme.blue} w="medium">View all</Txt></Pressable>
        </View>
        {top.map((i, idx) => (
          <Pressable
            key={i.vehicle.id}
            accessibilityRole="button"
            onPress={() => { setDraft(i.vehicle); navigation.navigate('Analyze'); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16, borderTopWidth: idx ? 1 : 0, borderTopColor: theme.border }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: theme.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Txt mono w="semibold">{i.result.score}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt w="medium" lines={1}>{i.vehicle.make} {i.vehicle.model}</Txt>
              <Txt size={12} muted>{i.vehicle.year} · {i.vehicle.km.toLocaleString('en-US')} km · {i.vehicle.country}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Txt mono w="semibold" color={i.result.expected.net >= 0 ? theme.pos : theme.neg}>{money(i.result.expected.net)}</Txt>
              <Txt size={11} mono muted>{pct(i.result.expected.roi)} ROI</Txt>
            </View>
          </Pressable>
        ))}
      </Card>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt w="semibold">Market intelligence</Txt>
          <Badge label="Demo prices" tone="warn" />
        </View>
        <Txt size={13} muted>See where the same model sells for the most across six countries.</Txt>
        <Btn label="Open market comparison" variant="outline" onPress={() => navigation.navigate('Market')} />
      </Card>
    </Screen>
  );
}
