import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const numColumns = 1;
  return { width, height, isTablet, isLandscape, numColumns };
}
