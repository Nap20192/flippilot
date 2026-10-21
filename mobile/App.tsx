import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/store';
import { useLayout } from './src/layout';
import { font, ThemeProvider, useTheme } from './src/theme';
import { AnalyzeScreen } from './src/screens/AnalyzeScreen';
import { DealsScreen } from './src/screens/DealsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MarketScreen } from './src/screens/MarketScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Lucide-style 24px stroke icons.
const ICONS: Record<string, React.ReactNode> = {
  Home: <><Rect x={3} y={3} width={7} height={9} rx={1} /><Rect x={14} y={3} width={7} height={5} rx={1} /><Rect x={14} y={12} width={7} height={9} rx={1} /><Rect x={3} y={16} width={7} height={5} rx={1} /></>,
  Analyze: <Path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />,
  Deals: <><Circle cx={11} cy={11} r={8} /><Path d="m21 21-4.3-4.3" /></>,
  Saved: <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />,
  Settings: <Path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />,
};
const TabIcon = ({ name, color }: { name: string; color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</Svg>
);

function Tabs() {
  const { theme } = useTheme();
  const { desktop } = useLayout();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
        tabBarActiveTintColor: theme.fg,
        tabBarInactiveTintColor: theme.mfg,
        tabBarPosition: desktop ? 'left' : 'bottom',
        tabBarVariant: desktop ? 'material' : 'uikit',
        tabBarStyle: desktop
          ? { backgroundColor: theme.card, borderRightColor: theme.border, borderRightWidth: 1, width: 232, paddingTop: 12, paddingHorizontal: 8 }
          : { backgroundColor: theme.bg, borderTopColor: theme.border, height: 62, paddingTop: 6 },
        tabBarActiveBackgroundColor: desktop ? theme.muted : undefined,
        tabBarItemStyle: desktop ? { borderRadius: 8, height: 40, marginBottom: 2, justifyContent: 'flex-start', paddingHorizontal: 8 } : undefined,
        tabBarLabelStyle: desktop ? { fontFamily: font.medium, fontSize: 14 } : { fontFamily: font.medium, fontSize: 11, marginBottom: 4 },
        headerStyle: { backgroundColor: theme.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: font.bold, fontSize: 20, color: theme.fg },
        headerTitleAlign: 'left',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard', tabBarLabel: 'Home' }} />
      <Tab.Screen name="Analyze" component={AnalyzeScreen} options={{ title: 'Analyze vehicle', tabBarLabel: 'Analyze' }} />
      <Tab.Screen name="Deals" component={DealsScreen} options={{ title: 'Deal finder', tabBarLabel: 'Deals' }} />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ title: 'Watchlist', tabBarLabel: 'Saved' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function Shell() {
  const { theme } = useTheme();
  const base = theme.mode === 'light' ? DefaultTheme : DarkTheme;
  return (
    <NavigationContainer theme={{ ...base, colors: { ...base.colors, background: theme.bg, card: theme.bg, text: theme.fg, border: theme.border, primary: theme.blue } }}>
      <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.bg }, headerTitleStyle: { fontFamily: font.bold, color: theme.fg }, headerTintColor: theme.fg, headerShadowVisible: false }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Market" component={MarketScreen} options={{ title: 'Market intelligence' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, GeistMono_500Medium });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StoreProvider>
          <Shell />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
