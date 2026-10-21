import { useWindowDimensions } from 'react-native';

/** Wide screens (desktop browser, tablet landscape) get a sidebar and multi-column pages. */
export function useLayout() {
  const { width } = useWindowDimensions();
  return { width, desktop: width >= 900 };
}
