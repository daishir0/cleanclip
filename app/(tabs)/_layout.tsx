import { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Animated, Easing } from 'react-native';
import { Colors } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';

function SyncIndicator({ tint }: { tint: string }) {
  const { syncEnabled, syncAvailable, syncStatus, theme, triggerSync } = useApp();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (syncStatus === 'syncing') {
      const loop = Animated.loop(Animated.timing(spin, {
        toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true,
      }));
      loop.start();
      return () => { loop.stop(); spin.setValue(0); };
    }
    spin.setValue(0);
  }, [syncStatus, spin]);

  if (!syncAvailable || !syncEnabled) return null;

  const iconName: any =
    syncStatus === 'syncing' ? 'sync'
    : syncStatus === 'error' ? 'cloud-offline-outline'
    : syncStatus === 'keyMismatch' ? 'key-outline'
    : syncStatus === 'unavailable' ? 'cloud-offline-outline'
    : 'cloud-done-outline';

  const color =
    syncStatus === 'error' || syncStatus === 'keyMismatch' || syncStatus === 'unavailable' ? theme.danger
    : syncStatus === 'syncing' ? tint
    : tint;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Pressable onPress={() => triggerSync()} hitSlop={10} style={{ marginRight: 12 }}
      accessibilityRole="button" accessibilityLabel="iCloud sync status">
      <Animated.View style={syncStatus === 'syncing' ? { transform: [{ rotate }] } : undefined}>
        <Ionicons name={iconName} size={20} color={color} />
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const { isDarkMode } = useApp();
  const router = useRouter();
  const { t } = useT();
  const tint = Colors[isDarkMode ? 'dark' : 'light'].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
            <SyncIndicator tint={tint} />
            <Pressable onPress={() => router.push('/file-view' as any)} accessibilityRole="button" accessibilityLabel={t('file_open')}>
              <Ionicons name="folder-open-outline" size={22} color={tint} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('modal_settings')}>
              <Ionicons name="settings-outline" size={24} color={tint} />
            </Pressable>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs_entries'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clean"
        options={{
          title: t('tabs_clean'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
