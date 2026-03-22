import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const numColumns = isTablet && isLandscape ? 3 : isTablet ? 2 : 1;
  return { width, height, isTablet, isLandscape, numColumns };
}
