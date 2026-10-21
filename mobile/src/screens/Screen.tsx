import React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLayout } from '../layout';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Btn, Card, Txt } from '../ui';

export function Screen({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const { theme } = useTheme();
  const { ready, error, reload } = useStore();
  const { desktop } = useLayout();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: desktop ? 28 : 16, paddingBottom: 40, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 1240, gap: 14 }}>
      {sub ? <Txt size={13} muted>{sub}</Txt> : null}
      {error ? (
        <Card style={{ gap: 10 }}>
          <Txt w="semibold">Can’t reach the server</Txt>
          <Txt size={13} muted>{error}</Txt>
          <Btn label="Try again" variant="outline" onPress={() => void reload()} />
        </Card>
      ) : !ready ? (
        <View style={{ paddingVertical: 60 }}><ActivityIndicator color={theme.mfg} /></View>
      ) : (
        children
      )}
      </View>
    </ScrollView>
  );
}
