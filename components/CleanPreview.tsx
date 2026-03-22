import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';

interface CleanPreviewProps {
  before: string;
  after: string;
}

export function CleanPreview({ before, after }: CleanPreviewProps) {
  const { theme } = useApp();
  const { t } = useT();
  const diff = before.length - after.length;

  const diffText = diff > 0
    ? t('clean_charDiff', { before: before.length.toLocaleString(), after: after.length.toLocaleString(), diff: diff.toLocaleString() })
    : diff < 0
      ? t('clean_charIncrease', { before: before.length.toLocaleString(), after: after.length.toLocaleString(), diff: Math.abs(diff).toLocaleString() })
      : t('clean_charNoChange', { count: before.length.toLocaleString() });

  return (
    <View style={styles.container}>
      <View style={[styles.diffBadge, { backgroundColor: theme.bgTertiary }]}>
        <Text style={[styles.diffText, { color: theme.text }]} accessibilityLabel={t('clean_charCountLabel', { text: diffText })}>
          {diffText}
        </Text>
      </View>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('clean_before')}</Text>
      <ScrollView style={[styles.textBox, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]} nestedScrollEnabled>
        <Text style={[styles.textContent, { color: theme.textSecondary }]} selectable>{before}</Text>
      </ScrollView>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('clean_after')}</Text>
      <ScrollView style={[styles.textBox, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]} nestedScrollEnabled>
        <Text style={[styles.textContent, { color: theme.text }]} selectable>{after}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  diffBadge: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 4 },
  diffText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginLeft: 4 },
  textBox: { maxHeight: 200, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  textContent: { fontSize: 14, lineHeight: 20 },
});
