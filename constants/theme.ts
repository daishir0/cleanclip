export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#007AFF',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#007AFF',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#0A84FF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#0A84FF',
  },
};

export interface Theme {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  danger: string;
  success: string;
}

export function getTheme(isDark: boolean): Theme {
  return {
    bg: isDark ? '#000' : '#fff',
    bgSecondary: isDark ? '#1c1c1e' : '#f2f2f7',
    bgTertiary: isDark ? '#2c2c2e' : '#e5e5ea',
    text: isDark ? '#fff' : '#000',
    textSecondary: isDark ? '#8e8e93' : '#6c6c70',
    border: isDark ? '#38383a' : '#c6c6c8',
    accent: isDark ? '#0A84FF' : '#007AFF',
    danger: '#FF3B30',
    success: '#34C759',
  };
}
