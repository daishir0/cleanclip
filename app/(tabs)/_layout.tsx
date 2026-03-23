import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';

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
          <Pressable onPress={() => router.push('/settings')} style={{ marginRight: 16 }}>
            <Ionicons name="settings-outline" size={24} color={tint} />
          </Pressable>
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
