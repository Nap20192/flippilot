import React from 'react';
import { Pressable, StyleProp, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { font, radius, useTheme } from './theme';

type TxtProps = {
  children: React.ReactNode; size?: number; w?: 'regular' | 'medium' | 'semibold' | 'bold'; mono?: boolean;
  color?: string; muted?: boolean; style?: StyleProp<TextStyle>; align?: TextStyle['textAlign']; lines?: number;
};
export function Txt({ children, size = 14, w = 'regular', mono, color, muted, style, align, lines }: TxtProps) {
  const { theme } = useTheme();
  return (
    <Text
      numberOfLines={lines}
      style={[{ fontSize: size, lineHeight: Math.round(size * 1.45), fontFamily: mono ? font.mono : font[w], color: color ?? (muted ? theme.mfg : theme.fg), textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}

export function Card({ children, style, pad = 16 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const { theme } = useTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: pad }, style]}>
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'pos' | 'neg' | 'warn' | 'blue' }) {
  const { theme } = useTheme();
  const map = {
    neutral: [theme.card, theme.mfg, theme.border], pos: [theme.posBg, theme.pos, 'transparent'], neg: [theme.negBg, theme.neg, 'transparent'],
    warn: [theme.warnBg, theme.warn, 'transparent'], blue: [theme.blueBg, theme.blue, 'transparent'],
  }[tone];
  return (
    <View style={{ backgroundColor: map[0], borderColor: map[2], borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, height: 22, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Txt size={12} w="medium" color={map[1]}>{label}</Txt>
    </View>
  );
}

export function Btn({ label, onPress, variant = 'primary', flex }: { label: string; onPress: () => void; variant?: 'primary' | 'outline'; flex?: boolean }) {
  const { theme } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{
        height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
        backgroundColor: primary ? theme.primary : theme.card, borderWidth: primary ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.85 : 1,
      }, flex && { flex: 1 }]}
    >
      <Txt w="medium" color={primary ? theme.pfg : theme.fg}>{label}</Txt>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: theme.muted, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o)}
            style={{ flex: 1, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.card : 'transparent' }}
          >
            <Txt size={13} w="medium" color={on ? theme.fg : theme.mfg}>{o}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, value, onChangeText, numeric, placeholder, hint }: {
  label: string; value: string; onChangeText: (t: string) => void; numeric?: boolean; placeholder?: string; hint?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 130, gap: 6 }}>
      <Txt size={13} w="medium">{label}</Txt>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mfg}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        style={{
          height: 44, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, paddingHorizontal: 12,
          color: theme.fg, backgroundColor: theme.card, fontFamily: numeric ? font.mono : font.regular, fontSize: 15,
        }}
      />
      {hint ? <Txt size={12} muted>{hint}</Txt> : null}
    </View>
  );
}

export function Row({ label, value, bold, last, color }: { label: string; value: string; bold?: boolean; last?: boolean; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border }}>
      <Txt size={13} muted={!bold} w={bold ? 'semibold' : 'regular'}>{label}</Txt>
      <Txt size={13} mono color={color} w={bold ? 'semibold' : 'regular'}>{value}</Txt>
    </View>
  );
}

export function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ gap: 2, marginBottom: 4 }}>
      <Txt size={26} w="bold" style={{ letterSpacing: -0.8 }}>{title}</Txt>
      {sub ? <Txt size={13} muted>{sub}</Txt> : null}
    </View>
  );
}
