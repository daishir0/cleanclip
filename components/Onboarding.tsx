import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useT } from '@/i18n';

const ONBOARDED_KEY = 'cleanclip_onboarded';
const { width } = Dimensions.get('window');

interface OnboardingProps {
  onComplete: () => void;
}

const PAGES = [
  { icon: 'lock-closed' as const, titleKey: 'onboarding_title1' as const, descKey: 'onboarding_desc1' as const, color: '#0A84FF' },
  { icon: 'copy' as const, titleKey: 'onboarding_title2' as const, descKey: 'onboarding_desc2' as const, color: '#34C759' },
  { icon: 'sparkles' as const, titleKey: 'onboarding_title3' as const, descKey: 'onboarding_desc3' as const, color: '#FF9500' },
  { icon: 'cloud-done' as const, titleKey: 'onboarding_title4' as const, descKey: 'onboarding_desc4' as const, color: '#5E5CE6' },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useT();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    onComplete();
  };

  const handleScroll = (e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const isLast = currentPage === PAGES.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll} decelerationRate="fast">
        {PAGES.map((page, idx) => (
          <View key={idx} style={[styles.page, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: page.color + '20' }]}>
              <Ionicons name={page.icon} size={64} color={page.color} />
            </View>
            <Text style={styles.title}>{t(page.titleKey)}</Text>
            <Text style={styles.desc}>{t(page.descKey)}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, idx) => (
            <View key={idx} style={[styles.dot, currentPage === idx && styles.dotActive]} />
          ))}
        </View>
        {isLast ? (
          <Pressable onPress={handleComplete} style={styles.startBtn}>
            <Text style={styles.startBtnText}>{t('onboarding_start')}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => {
            const nextPage = currentPage + 1;
            scrollRef.current?.scrollTo({ x: nextPage * width, animated: true });
            setCurrentPage(nextPage);
          }} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>{t('onboarding_next')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#0A84FF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export async function checkOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDED_KEY);
  return val === 'true';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  page: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#1c1c1e', textAlign: 'center', marginBottom: 16 },
  desc: { fontSize: 16, color: '#6c6c70', textAlign: 'center', lineHeight: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 48, alignItems: 'center', gap: 20 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d1d6' },
  dotActive: { backgroundColor: '#0A84FF', width: 24 },
  startBtn: { backgroundColor: '#0A84FF', paddingHorizontal: 48, paddingVertical: 16, borderRadius: 14 },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 16 },
  nextBtnText: { color: '#0A84FF', fontSize: 17, fontWeight: '500' },
});
