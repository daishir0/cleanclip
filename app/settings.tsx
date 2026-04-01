import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useT, type Locale } from '@/i18n';
import { exportData, importData } from '@/services/export-service';
import { isCloudSyncAvailable, isSyncEnabled, setSyncEnabled, performSync } from '@/services/sync-service';

export default function SettingsScreen() {
  const { isDarkMode, toggleDarkMode, deleteAllEntries, theme } = useApp();
  const { t, locale, setLocale } = useT();
  const router = useRouter();

  const [syncOn, setSyncOn] = useState(false);
  const cloudAvailable = isCloudSyncAvailable();

  useEffect(() => {
    if (cloudAvailable) isSyncEnabled().then(setSyncOn);
  }, [cloudAvailable]);

  const handleToggleSync = async (val: boolean) => {
    setSyncOn(val);
    await setSyncEnabled(val);
    if (val) {
      const result = await performSync();
      if (result.synced) Alert.alert(t('common_done'), t('settings_syncSuccess', { count: String(result.count) }));
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(t('settings_deleteAllTitle'), t('settings_deleteAllMessage'), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('common_delete'), style: 'destructive', onPress: async () => {
        await deleteAllEntries();
        Alert.alert(t('common_done'), t('settings_deleteAllDone'));
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('modal_settings')}</Text>
        <View style={styles.headerButton} />
      </View>

    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      {/* Appearance */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_appearance')}</Text>
      <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: theme.text }]}>{t('settings_darkMode')}</Text>
          <Switch value={isDarkMode} onValueChange={toggleDarkMode}
            trackColor={{ false: theme.border, true: theme.accent }} accessibilityLabel={t('settings_darkModeLabel')} />
        </View>
      </View>

      {/* Language */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_language')}</Text>
      <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        {(['ja', 'en'] as Locale[]).map((lang, idx) => (
          <Pressable key={lang} onPress={() => setLocale(lang)}
            style={[styles.row, idx === 0 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
            accessibilityRole="radio" accessibilityState={{ selected: locale === lang }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>
              {lang === 'ja' ? t('settings_languageJa') : t('settings_languageEn')}
            </Text>
            {locale === lang && <Ionicons name="checkmark" size={20} color={theme.accent} />}
          </Pressable>
        ))}
      </View>

      {/* iCloud Sync (iOS only) */}
      {cloudAvailable && (
        <>
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_icloudSync')}</Text>
          <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLabel}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{t('settings_icloudSync')}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{t('settings_icloudSyncDesc')}</Text>
              </View>
              <Switch value={syncOn} onValueChange={handleToggleSync}
                trackColor={{ false: theme.border, true: theme.accent }} accessibilityLabel={t('settings_icloudSync')} />
            </View>
          </View>
        </>
      )}

      {/* Security */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_security')}</Text>
      <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark" size={20} color={theme.success} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>{t('settings_securityEncryption')}</Text>
        </View>
        {Platform.OS === 'ios' && (
          <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <Ionicons name="eye-off" size={20} color={theme.accent} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{t('settings_securityScreenshot')}</Text>
          </View>
        )}
        {Platform.OS === 'ios' && (
          <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <Ionicons name="information-circle" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{t('settings_securityMacNote')}</Text>
          </View>
        )}
      </View>

      {/* Data Management */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_dataManagement')}</Text>
      <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <Pressable onPress={async () => {
          const ok = await exportData();
          if (!ok) Alert.alert(t('common_error'), t('settings_exportError'));
        }} style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
          accessibilityLabel={t('settings_export')} accessibilityRole="button">
          <Ionicons name="share-outline" size={20} color={theme.accent} />
          <Text style={[styles.rowTitle, { color: theme.accent, marginLeft: 8 }]}>{t('settings_export')}</Text>
        </Pressable>
        <Pressable onPress={async () => {
          const { success, count } = await importData();
          if (success) {
            Alert.alert(t('common_done'), t('settings_importSuccess', { count: String(count) }));
          }
        }} style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
          accessibilityLabel={t('settings_import')} accessibilityRole="button">
          <Ionicons name="download-outline" size={20} color={theme.accent} />
          <Text style={[styles.rowTitle, { color: theme.accent, marginLeft: 8 }]}>{t('settings_import')}</Text>
        </Pressable>
        <Pressable onPress={handleDeleteAll} style={styles.row}
          accessibilityLabel={t('settings_deleteAll')} accessibilityRole="button">
          <Ionicons name="trash" size={20} color={theme.danger} />
          <Text style={[styles.rowTitle, { color: theme.danger, marginLeft: 8 }]}>{t('settings_deleteAll')}</Text>
        </Pressable>
      </View>

    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  container: { flex: 1 }, content: { paddingBottom: 40 },
  sectionHeader: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 24, marginBottom: 8, marginHorizontal: 16 },
  section: { marginHorizontal: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 16 },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
