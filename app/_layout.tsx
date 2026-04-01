import { useState, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { LocaleProvider, useT } from '@/i18n';
import { AuthGate } from '@/components/AuthGate';
import { PrivacyOverlay } from '@/components/PrivacyOverlay';
import { Onboarding, checkOnboarded } from '@/components/Onboarding';

function NavigationContent() {
  const { isDarkMode } = useApp();
  const { t } = useT();

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="entry-edit" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
        <PrivacyOverlay />
      </AuthGate>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

function InnerLayout() {
  const { t } = useT();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => { checkOnboarded().then(setOnboarded); }, []);

  if (onboarded === null) return null; // loading
  if (!onboarded) return <Onboarding onComplete={() => setOnboarded(true)} />;

  return (
    <AppProvider>
      <NavigationContent />
    </AppProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocaleProvider>
        <InnerLayout />
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}
