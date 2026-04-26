import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';
import { useToast } from '@/components/Toast';
import { pickAnyTextFile, saveTextToFile } from '@/services/file-service';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export default function FileViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialName?: string; initialContent?: string }>();
  const { theme, addEntry } = useApp();
  const { t } = useT();
  const { showToast } = useToast();

  const [filename, setFilename] = useState(params.initialName ?? '');
  const [content, setContent] = useState(params.initialContent ?? '');
  const [busy, setBusy] = useState(false);

  const handleOpenFile = useCallback(async () => {
    setBusy(true);
    try {
      const picked = await pickAnyTextFile();
      if (!picked) return;
      setFilename(picked.name);
      setContent(picked.content);
    } catch (err: any) {
      showToast(t('file_loadError'), 'error');
    } finally {
      setBusy(false);
    }
  }, [showToast, t]);

  const handleSaveToFile = useCallback(async () => {
    if (!filename.trim()) {
      Alert.alert(t('common_error'), t('file_filenameRequired'));
      return;
    }
    setBusy(true);
    try {
      await saveTextToFile(content, filename.trim());
      showToast(t('file_savedToast'), 'success');
    } catch {
      showToast(t('file_saveError'), 'error');
    } finally {
      setBusy(false);
    }
  }, [filename, content, showToast, t]);

  const handleSaveAsEntry = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert(t('common_error'), t('entryEdit_errorNoContent'));
      return;
    }
    const now = Date.now();
    const name = filename.trim() || t('file_untitledEntry');
    await addEntry({
      id: generateId(),
      name,
      content,
      masked: false,
      createdAt: now,
      updatedAt: now,
    });
    showToast(t('file_savedAsEntryToast'), 'success');
    router.back();
  }, [content, filename, addEntry, router, showToast, t]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel={t('common_cancel')} accessibilityRole="button">
          <Text style={[styles.headerBtn, { color: theme.accent }]}>{t('common_done')}</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('file_title')}</Text>
        <View style={{ minWidth: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('file_filename')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
          value={filename} onChangeText={setFilename}
          placeholder={t('file_filenamePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none" autoCorrect={false}
          accessibilityLabel={t('file_filename')}
        />

        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 20 }]}>{t('file_content')}</Text>
        <TextInput
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
          value={content} onChangeText={setContent}
          placeholder={t('file_contentPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          multiline textAlignVertical="top" autoCapitalize="none" autoCorrect={false}
          accessibilityLabel={t('file_content')}
        />

        <View style={styles.actions}>
          <Pressable onPress={handleOpenFile} disabled={busy}
            style={[styles.actionBtn, { backgroundColor: theme.bgSecondary, borderColor: theme.border, opacity: busy ? 0.5 : 1 }]}
            accessibilityLabel={t('file_open')} accessibilityRole="button">
            <Ionicons name="folder-open-outline" size={18} color={theme.accent} />
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>{t('file_open')}</Text>
          </Pressable>
          <Pressable onPress={handleSaveToFile} disabled={busy}
            style={[styles.actionBtn, { backgroundColor: theme.accent, opacity: busy ? 0.5 : 1 }]}
            accessibilityLabel={t('file_save')} accessibilityRole="button">
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>{t('file_save')}</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSaveAsEntry} disabled={busy}
          style={[styles.secondaryBtn, { borderColor: theme.border, opacity: busy ? 0.5 : 1 }]}
          accessibilityLabel={t('file_saveAsEntry')} accessibilityRole="button">
          <Ionicons name="bookmark-outline" size={16} color={theme.text} />
          <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t('file_saveAsEntry')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerBtn: { fontSize: 17, fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  input: { fontSize: 17, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  textArea: { fontSize: 14, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, minHeight: 280, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginTop: 12 },
  secondaryBtnText: { fontSize: 14, fontWeight: '500' },
});
