import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';
import { getClipboardText, copyToClipboard } from '@/services/clipboard-service';
import { cleanText } from '@/services/clean-service';
import { CleanPreview } from '@/components/CleanPreview';

export default function CleanScreen() {
  const { theme, settings } = useApp();
  const { t } = useT();
  const [beforeText, setBeforeText] = useState<string | null>(null);
  const [afterText, setAfterText] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleReadClipboard = async () => {
    const text = await getClipboardText();
    if (!text || text.trim().length === 0) { setBeforeText(null); setAfterText(null); return; }
    setBeforeText(text); setAfterText(cleanText(text)); setApplied(false);
  };

  const handleApply = async () => {
    if (!afterText) return;
    const clearMs = settings.autoClearClipboard ? (settings.autoClearDelayMs || 30000) : undefined;
    await copyToClipboard(afterText, clearMs);
    setApplied(true);
  };

  const handleCancel = () => { setBeforeText(null); setAfterText(null); setApplied(false); };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <Pressable onPress={handleReadClipboard} style={[styles.mainButton, { backgroundColor: theme.accent }]}
        accessibilityLabel={t('clean_readClipboard')} accessibilityRole="button">
        <Ionicons name="clipboard-outline" size={22} color="#fff" />
        <Text style={styles.mainButtonText}>{t('clean_readClipboard')}</Text>
      </Pressable>

      {beforeText && afterText && !applied && (
        <>
          <CleanPreview before={beforeText} after={afterText} />
          <View style={styles.actions}>
            <Pressable onPress={handleCancel} style={[styles.actionBtn, { backgroundColor: theme.bgTertiary }]}
              accessibilityLabel={t('common_cancel')} accessibilityRole="button">
              <Text style={[styles.actionBtnText, { color: theme.text }]}>{t('common_cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleApply} style={[styles.actionBtn, { backgroundColor: theme.accent }]}
              accessibilityLabel={t('clean_apply')} accessibilityHint={t('clean_applyHint')} accessibilityRole="button">
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>{t('clean_apply')}</Text>
            </Pressable>
          </View>
        </>
      )}

      {applied && (
        <View style={styles.appliedState}>
          <Ionicons name="checkmark-circle" size={48} color={theme.success} />
          <Text style={[styles.appliedText, { color: theme.text }]}>{t('clean_applied')}</Text>
          <Pressable onPress={handleCancel} style={[styles.resetBtn, { borderColor: theme.border }]}
            accessibilityLabel={t('clean_tryAgain')} accessibilityRole="button">
            <Text style={[styles.resetBtnText, { color: theme.accent }]}>{t('clean_tryAgain')}</Text>
          </Pressable>
        </View>
      )}

      {!beforeText && !applied && (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('clean_emptyDescription')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, gap: 16 },
  mainButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  mainButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 10 },
  actionBtnText: { fontSize: 16, fontWeight: '600' },
  appliedState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  appliedText: { fontSize: 17, fontWeight: '600' },
  resetBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  resetBtnText: { fontSize: 15, fontWeight: '500' },
  emptyState: { alignItems: 'center', gap: 16, paddingVertical: 60 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
