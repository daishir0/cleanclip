import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useT, type Locale } from '@/i18n';
import { exportData, importData } from '@/services/export-service';
import { useToast } from '@/components/Toast';
import { formatRelative } from '@/utils/relative-time';

const KEYCHAIN_HELP_URL = 'https://support.apple.com/HT204085';
const ADP_HELP_URL = 'https://support.apple.com/HT212520';

export default function SettingsScreen() {
  const {
    isDarkMode, toggleDarkMode, deleteAllEntries, theme, settings, updateSettings,
    syncStatus, syncEnabled, syncAvailable, lastSyncAt, triggerSync, setSyncEnabled,
  } = useApp();
  const { t, locale, setLocale } = useT();
  const { showToast } = useToast();
  const router = useRouter();

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!syncEnabled || !lastSyncAt) return;
    const id = setInterval(() => setTick(v => v + 1), 30_000);
    return () => clearInterval(id);
  }, [syncEnabled, lastSyncAt]);

  const handleToggleSync = useCallback(async (val: boolean) => {
    await setSyncEnabled(val);
    if (val) {
      showToast(t('settings_syncStatusSyncing'), 'info');
    }
  }, [setSyncEnabled, showToast, t]);

  const handleManualSync = useCallback(async () => {
    const result = await triggerSync();
    if (result.kind === 'ok') {
      showToast(t('toast_syncOk', { count: String(result.total) }), 'success');
    } else if (result.kind === 'keyMismatch') {
      showToast(t('toast_syncKeyMismatch'), 'error');
    } else if (result.kind === 'quotaExceeded') {
      showToast(t('toast_syncQuotaExceeded'), 'error');
    } else if (result.kind === 'unavailable') {
      showToast(t('toast_syncUnavailable'), 'error');
    } else if (result.kind === 'error') {
      showToast(t('toast_syncError'), 'error');
    }
  }, [triggerSync, showToast, t]);

  const handleDeleteAll = () => {
    Alert.alert(t('settings_deleteAllTitle'), t('settings_deleteAllMessage'), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('common_delete'), style: 'destructive', onPress: async () => {
        await deleteAllEntries();
        Alert.alert(t('common_done'), t('settings_deleteAllDone'));
      }},
    ]);
  };

  const statusKey: 'settings_syncStatusIdle' | 'settings_syncStatusSyncing' | 'settings_syncStatusError' | 'settings_syncStatusKeyMismatch' | 'settings_syncStatusUnavailable' | 'settings_syncStatusDisabled' | 'settings_syncStatusQuotaExceeded' =
    syncStatus === 'syncing' ? 'settings_syncStatusSyncing'
    : syncStatus === 'error' ? 'settings_syncStatusError'
    : syncStatus === 'keyMismatch' ? 'settings_syncStatusKeyMismatch'
    : syncStatus === 'quotaExceeded' ? 'settings_syncStatusQuotaExceeded'
    : syncStatus === 'unavailable' ? 'settings_syncStatusUnavailable'
    : syncStatus === 'disabled' ? 'settings_syncStatusDisabled'
    : 'settings_syncStatusIdle';

  const statusIconName: any =
    syncStatus === 'syncing' ? 'sync'
    : syncStatus === 'error' ? 'cloud-offline-outline'
    : syncStatus === 'keyMismatch' ? 'key-outline'
    : syncStatus === 'quotaExceeded' ? 'alert-circle-outline'
    : syncStatus === 'unavailable' ? 'cloud-offline-outline'
    : syncStatus === 'disabled' ? 'cloud-outline'
    : 'cloud-done-outline';

  const statusIconColor =
    syncStatus === 'error' || syncStatus === 'keyMismatch' || syncStatus === 'unavailable' || syncStatus === 'quotaExceeded' ? theme.danger
    : syncStatus === 'syncing' ? theme.accent
    : syncStatus === 'idle' ? theme.success
    : theme.textSecondary;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('modal_settings')}</Text>
        <View style={styles.headerButton} />
      </View>

    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_appearance')}</Text>
      <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: theme.text }]}>{t('settings_darkMode')}</Text>
          <Switch value={isDarkMode} onValueChange={toggleDarkMode}
            trackColor={{ false: theme.border, true: theme.accent }} accessibilityLabel={t('settings_darkModeLabel')} />
        </View>
      </View>

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

      {syncAvailable && (
        <>
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_icloudSync')}</Text>
          <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLabel}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{t('settings_icloudSync')}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{t('settings_icloudSyncDesc')}</Text>
              </View>
              <Switch value={syncEnabled} onValueChange={handleToggleSync}
                trackColor={{ false: theme.border, true: theme.accent }} accessibilityLabel={t('settings_icloudSync')} />
            </View>

            {syncEnabled && (
              <View style={[styles.statusRow, { borderTopColor: theme.border }]}>
                <View style={[styles.statusIconCircle, { backgroundColor: theme.bgTertiary }]}>
                  {syncStatus === 'syncing'
                    ? <ActivityIndicator size="small" color={theme.accent} />
                    : <Ionicons name={statusIconName} size={20} color={statusIconColor} />
                  }
                </View>
                <View style={styles.statusTexts}>
                  <Text style={[styles.statusTitle, { color: theme.text }]}>{t(statusKey)}</Text>
                  <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}
                    accessibilityLabel={t('settings_syncLastSynced', { time: formatRelative(lastSyncAt, t) })}>
                    {t('settings_syncLastSynced', { time: formatRelative(lastSyncAt, t) })}
                  </Text>
                </View>
                <Pressable onPress={handleManualSync}
                  disabled={syncStatus === 'syncing'}
                  style={[styles.syncBtn, { borderColor: theme.accent, opacity: syncStatus === 'syncing' ? 0.5 : 1 }]}
                  accessibilityRole="button" accessibilityLabel={t('settings_syncNow')}>
                  <Ionicons name="refresh" size={14} color={theme.accent} />
                  <Text style={[styles.syncBtnText, { color: theme.accent }]}>{t('settings_syncNow')}</Text>
                </Pressable>
              </View>
            )}

            {syncEnabled && syncStatus === 'keyMismatch' && (
              <Pressable onPress={() => Linking.openURL(KEYCHAIN_HELP_URL)}
                style={[styles.helpRow, { borderTopColor: theme.border }]}
                accessibilityRole="link" accessibilityLabel={t('settings_syncKeychainHelp')}>
                <Ionicons name="help-circle-outline" size={18} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpTitle, { color: theme.accent }]}>{t('settings_syncKeychainHelp')}</Text>
                  <Text style={[styles.helpDesc, { color: theme.textSecondary }]}>{t('settings_syncKeychainHelpDesc')}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>
        </>
      )}

      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{t('settings_security')}</Text>
      <View style={[styles.section, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{t('settings_clipboardAutoClear')}</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{t('settings_clipboardAutoClearDesc')}</Text>
          </View>
          <Switch value={settings.clipboardAutoClear !== false}
            onValueChange={val => updateSettings({ ...settings, clipboardAutoClear: val })}
            trackColor={{ false: theme.border, true: theme.accent }}
            accessibilityLabel={t('settings_clipboardAutoClear')} />
        </View>
        <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
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
        {Platform.OS === 'ios' && (
          <Pressable onPress={() => Linking.openURL(ADP_HELP_URL)}
            style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
            accessibilityRole="link" accessibilityLabel={t('settings_securityAdpHint')}>
            <Ionicons name="lock-closed" size={20} color={theme.accent} />
            <Text style={[styles.infoText, { color: theme.accent }]}>{t('settings_securityAdpHint')}</Text>
            <Ionicons name="open-outline" size={14} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

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
  headerButton: { minWidth: 44 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  container: { flex: 1 }, content: { paddingBottom: 40 },
  sectionHeader: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 24, marginBottom: 8, marginHorizontal: 16 },
  section: { marginHorizontal: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 16 },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statusTexts: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '600' },
  statusSubtitle: { fontSize: 12, marginTop: 2 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, borderWidth: 1,
  },
  syncBtnText: { fontSize: 12, fontWeight: '600' },
  helpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  helpTitle: { fontSize: 14, fontWeight: '500' },
  helpDesc: { fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
