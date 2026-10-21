import React from 'react';
import { Pressable, View } from 'react-native';
import { RangeRow } from '../charts';
import { pct } from '../format';
import { useLayout } from '../layout';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Badge, Btn, Card, Txt } from '../ui';
import { Screen } from './Screen';

export function SavedScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { desktop } = useLayout();
  const { items, watch, money, toggleWatch, setDraft } = useStore();
  const saved = watch.map((id) => items.find((i) => i.vehicle.id === id)).filter((x): x is NonNullable<typeof x> => !!x);

  if (watch.length === 0)
    return (
      <Screen sub="Compare the opportunities you’ve saved.">
        <Card style={{ gap: 10 }}>
          <Txt size={13} muted>Nothing saved yet. Add vehicles from the Deal finder or the analyzer.</Txt>
          <Btn label="Open Deal finder" variant="outline" onPress={() => navigation.navigate('Deals')} />
        </Card>
      </Screen>
    );

  const best = saved.reduce((a, b) => (b.result.expected.net > a.result.expected.net ? b : a));
  const lo = Math.min(0, ...saved.map((s) => s.result.conservative.net)) - 300;
  const hi = Math.max(...saved.map((s) => s.result.optimistic.net)) + 300;

  return (
    <Screen sub="Best pick is highlighted. Bars show conservative to optimistic profit.">
      <Card style={{ backgroundColor: theme.posBg, borderColor: 'transparent', gap: 2 }}>
        <Txt size={12} color={theme.pos} w="medium">Best pick</Txt>
        <Txt w="semibold" color={theme.pos}>{best.vehicle.make} {best.vehicle.model}</Txt>
      </Card>

      <Card style={{ gap: 16 }}>
        <Txt w="semibold">Profit across scenarios</Txt>
        {saved.map((s) => (
          <RangeRow key={s.vehicle.id} name={`${s.vehicle.make} ${s.vehicle.model}`} cons={s.result.conservative.net} exp={s.result.expected.net} opt={s.result.optimistic.net} lo={lo} hi={hi} format={money} />
        ))}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {saved.map((s) => {
        const isBest = s.vehicle.id === best.vehicle.id;
        return (
          <Card key={s.vehicle.id} style={{ gap: 12, borderColor: isBest ? theme.pos : theme.border, width: desktop ? '32%' : '100%', minWidth: desktop ? 300 : undefined, flexGrow: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Txt w="semibold" lines={1}>{s.vehicle.make} {s.vehicle.model}</Txt>
                <Txt size={12} muted>{s.vehicle.year} · {s.vehicle.km.toLocaleString('en-US')} km · {s.vehicle.country}</Txt>
              </View>
              <Badge label={`Score ${s.result.score}`} tone={isBest ? 'pos' : 'neutral'} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              {[['Profit', money(s.result.expected.net), s.result.expected.net >= 0 ? theme.pos : theme.neg], ['ROI', pct(s.result.expected.roi), undefined], ['Max price', money(s.result.maxPrice), undefined]].map(([l, v, c]) => (
                <View key={l as string} style={{ flex: 1 }}><Txt size={11} muted>{l}</Txt><Txt mono w="semibold" color={c as string | undefined}>{v}</Txt></View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable accessibilityRole="button" hitSlop={10} onPress={() => { setDraft(s.vehicle); navigation.navigate('Analyze'); }}><Txt size={13} w="medium" color={theme.blue}>Analyze</Txt></Pressable>
              <Pressable accessibilityRole="button" hitSlop={10} onPress={() => void toggleWatch(s.vehicle.id)}><Txt size={13} w="medium" color={theme.neg}>Remove</Txt></Pressable>
            </View>
          </Card>
        );
      })}
      </View>
    </Screen>
  );
}
