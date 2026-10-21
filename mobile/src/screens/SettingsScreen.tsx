import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Settings, usingMock } from '../api';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Badge, Btn, Card, Field, Segmented, Txt } from '../ui';
import { Screen } from './Screen';

const CUR = ['EUR', 'CZK', 'PLN'] as const;
const THEME = ['Light', 'Dark'] as const;
const num = (s: string) => { const v = parseFloat(s); return Number.isFinite(v) ? v : NaN; };

export function SettingsScreen() {
  const { theme, setMode } = useTheme();
  const { settings, updateSettings } = useStore();
  const [f, setF] = useState<Record<string, string>>({});
  const [cur, setCur] = useState<Settings['cur']>('EUR');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setF({ name: settings.name, target: String(settings.target), fees: String(settings.fees), day: String(settings.day), fxCZK: String(settings.fxCZK), fxPLN: String(settings.fxPLN) });
    setCur(settings.cur);
  }, [settings]);
  const set = (k: string) => (t: string) => setF({ ...f, [k]: t });

  const save = async () => {
    const next: Settings = { ...settings, name: f.name, cur, target: num(f.target), fees: num(f.fees), day: num(f.day), fxCZK: num(f.fxCZK), fxPLN: num(f.fxPLN) };
    if (![next.target, next.fees, next.day, next.fxCZK, next.fxPLN].every(Number.isFinite) || next.fxCZK <= 0 || next.fxPLN <= 0) return setMsg('Enter valid numbers.');
    await updateSettings(next);
    setMsg('Saved. Changes apply on the next calculation.');
  };

  return (
    <Screen sub="Profile and calculator defaults.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
      <Card style={{ gap: 14, flexGrow: 1, flexBasis: 340 }}>
        <Txt w="semibold">Profile</Txt>
        <Field label="Display name" value={f.name ?? ''} onChangeText={set('name')} />
        <Txt size={12} muted>{usingMock ? 'Demo mode: using built-in sample data, not the server.' : 'Connected to the FlipPilot server.'}</Txt>
      </Card>

      <Card style={{ gap: 14, flexGrow: 1, flexBasis: 340 }}>
        <Txt w="semibold">Calculator defaults</Txt>
        <View style={{ gap: 6 }}><Txt size={13} w="medium">Display currency</Txt><Segmented value={cur} options={CUR} onChange={setCur} /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Target ROI (%)" value={f.target ?? ''} onChangeText={set('target')} /><Field numeric label="Fees per deal (€)" value={f.fees ?? ''} onChangeText={set('fees')} /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><Field numeric label="Holding (€/day)" value={f.day ?? ''} onChangeText={set('day')} /><Field numeric label="CZK per €1" value={f.fxCZK ?? ''} onChangeText={set('fxCZK')} /></View>
        <Field numeric label="PLN per €1" value={f.fxPLN ?? ''} onChangeText={set('fxPLN')} hint="Fixed illustrative rates, not live." />
        <Btn label="Save changes" onPress={() => void save()} />
        {msg ? <Txt size={12} color={msg.startsWith('Saved') ? theme.pos : theme.neg}>{msg}</Txt> : null}
      </Card>

      <Card style={{ gap: 10, flexGrow: 1, flexBasis: 340 }}>
        <Txt w="semibold">Appearance</Txt>
        <Segmented value={theme.mode === 'light' ? 'Light' : 'Dark'} options={THEME} onChange={(v) => setMode(v === 'Light' ? 'light' : 'dark')} />
        <Badge label="Light is the default" />
      </Card>
      </View>
    </Screen>
  );
}
