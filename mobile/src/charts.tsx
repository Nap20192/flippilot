import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { useTheme } from './theme';
import { Txt } from './ui';

/** Half-circle deal score gauge. */
export function Gauge({ score, size = 112 }: { score: number; size?: number }) {
  const { theme } = useTheme();
  const color = score >= 70 ? theme.pos : score >= 50 ? theme.blue : score >= 30 ? theme.warn : theme.neg;
  return (
    <View style={{ width: size, alignItems: 'center' }} accessible accessibilityLabel={`Deal score ${score} out of 100`}>
      <Svg width={size} height={size * 0.6} viewBox="0 0 120 70">
        <Path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke={theme.muted} strokeWidth={10} strokeLinecap="round" />
        <Path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${Math.max(0.1, score) * 1.57} 157`} />
      </Svg>
      <View style={{ position: 'absolute', top: size * 0.22 }}>
        <Txt size={size * 0.26} mono w="semibold">{score}</Txt>
      </View>
    </View>
  );
}

/** Donut with centre label. segments are shares that sum to ~1. */
export function Donut({ segments, size = 128, center, sub }: { segments: { v: number; c: string }[]; size?: number; center: string; sub?: string }) {
  const { theme } = useTheme();
  const total = segments.reduce((s, x) => s + x.v, 0) || 1;
  const R = 15.9155;
  let off = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={18} cy={18} r={R} fill="none" stroke={theme.muted} strokeWidth={4.2} />
        {segments.map((s, i) => {
          const len = (s.v / total) * 100;
          const el = <Circle key={i} cx={18} cy={18} r={R} fill="none" stroke={s.c} strokeWidth={4.2} strokeDasharray={`${Math.max(0, len - 0.6)} ${100 - Math.max(0, len - 0.6)}`} strokeDashoffset={-off} />;
          off += len;
          return el;
        })}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Txt size={size * 0.15} mono w="semibold">{center}</Txt>
        {sub ? <Txt size={11} muted>{sub}</Txt> : null}
      </View>
    </View>
  );
}

/** Ranked vertical bars with a zero line and optional threshold. Values in EUR. */
export function ProfitBars({ data, threshold, height = 220, format }: { data: { name: string; v: number }[]; threshold?: number; height?: number; format: (v: number) => string }) {
  const { theme } = useTheme();
  const max = Math.max(...data.map((d) => d.v), threshold ?? 0, 1);
  const min = Math.min(...data.map((d) => d.v), 0);
  const top = 22, bottom = 36, plot = height - top - bottom;
  const y = (v: number) => top + ((max - v) / (max - min || 1)) * plot;
  return (
    <View style={{ height, flexDirection: 'row', gap: 4 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y(0), borderTopWidth: 1, borderColor: theme.mfg, opacity: 0.4 }} />
      {threshold != null && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: y(threshold), borderTopWidth: 1, borderStyle: 'dashed', borderColor: theme.pos }} />}
      {data.map((d) => {
        const t = d.v >= 0 ? y(d.v) : y(0), h = Math.max(3, Math.abs(y(d.v) - y(0)));
        return (
          <View key={d.name} style={{ flex: 1 }} accessible accessibilityLabel={`${d.name} ${format(d.v)}`}>
            <View style={{ position: 'absolute', left: '12%', right: '12%', top: t, height: h, borderRadius: 4, backgroundColor: d.v >= 0 ? theme.pos : theme.neg }} />
            <View style={{ position: 'absolute', left: -4, right: -4, top: d.v >= 0 ? t - 16 : t + h + 2, alignItems: 'center' }}>
              <Txt size={9.5} mono align="center" lines={1}>{`${d.v < 0 ? '−' : ''}${Math.abs(Math.round(d.v))}`}</Txt>
            </View>
            <View style={{ position: 'absolute', left: -4, right: -4, bottom: 0, alignItems: 'center' }}>
              <Txt size={9.5} muted align="center" lines={1}>{d.name}</Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Conservative -> optimistic range with expected dot, per listing. */
export function RangeRow({ name, cons, exp, opt, lo, hi, format }: { name: string; cons: number; exp: number; opt: number; lo: number; hi: number; format: (v: number) => string }) {
  const { theme } = useTheme();
  const p = (v: number) => `${((v - lo) / (hi - lo)) * 100}%` as `${number}%`;
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${name}, ${format(cons)} to ${format(opt)}, expected ${format(exp)}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt size={13} w="medium" lines={1} style={{ flex: 1 }}>{name}</Txt>
        <Txt size={12} mono color={exp >= 0 ? theme.pos : theme.neg}>{format(exp)}</Txt>
      </View>
      <View style={{ height: 14, justifyContent: 'center' }}>
        <View style={{ height: 2, backgroundColor: theme.muted }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: p(0), borderLeftWidth: 1, borderStyle: 'dashed', borderColor: theme.mfg }} />
        <View style={{ position: 'absolute', top: 3, height: 8, borderRadius: 99, left: p(cons), width: `${((opt - cons) / (hi - lo)) * 100}%` as `${number}%`, backgroundColor: theme.blue, opacity: 0.25 }} />
        <View style={{ position: 'absolute', left: p(exp), marginLeft: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: exp >= 0 ? theme.pos : theme.neg, borderWidth: 3, borderColor: theme.card }} />
      </View>
    </View>
  );
}

/** Profit as a function of purchase price: a straight line with target and asking markers. */
export function PriceLine({ asking, target, breakEven, from, to }: { asking: number; target: number; breakEven: number; from: number; to: number }) {
  const { theme } = useTheme();
  const W = 300, H = 110;
  const x = (v: number) => ((v - from) / (to - from)) * W;
  const lineY = (v: number) => 12 + ((v - from) / (to - from)) * (H - 40) * 1.0; // profit falls 1:1 with price
  const zeroX = x(breakEven);
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" accessibilityLabel="Profit falls one-for-one as the purchase price rises">
      <Defs><LinearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={theme.blue} stopOpacity={0.25} /><Stop offset="1" stopColor={theme.blue} stopOpacity={0} /></LinearGradient></Defs>
      <Polygon points={`0,${lineY(from)} ${zeroX},${lineY(breakEven)} ${zeroX},${H - 20} 0,${H - 20}`} fill="url(#pl)" />
      <Line x1={0} y1={H - 20} x2={W} y2={H - 20} stroke={theme.border} />
      <Path d={`M0 ${lineY(from)} L${W} ${lineY(to)}`} stroke={theme.blue} strokeWidth={3} strokeLinecap="round" />
      <Line x1={x(target)} y1={6} x2={x(target)} y2={H - 20} stroke={theme.blue} strokeDasharray="4 4" />
      <Line x1={x(asking)} y1={6} x2={x(asking)} y2={H - 20} stroke={theme.fg} strokeDasharray="4 4" opacity={0.5} />
      <Circle cx={x(target)} cy={lineY(target)} r={5} fill={theme.blue} stroke={theme.card} strokeWidth={2} />
      <Circle cx={x(asking)} cy={lineY(asking)} r={5} fill={theme.fg} stroke={theme.card} strokeWidth={2} />
    </Svg>
  );
}
