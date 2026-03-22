import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Switch, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export default function EntryEditScreen() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { entries, addEntry, updateEntry, deleteEntry, theme } = useApp();
  const { t } = useT();

  const existingEntry = useMemo(() => entries.find(e => e.id === entryId), [entries, entryId]);
  const [name, setName] = useState(existingEntry?.name ?? '');
  const [content, setContent] = useState(existingEntry?.content ?? '');
  const [masked, setMasked] = useState(existingEntry?.masked ?? false);
  const isEditing = !!existingEntry;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('common_error'), t('entryEdit_errorNoName')); return; }
    if (!content.trim()) { Alert.alert(t('common_error'), t('entryEdit_errorNoContent')); return; }
    const now = Date.now();
    if (isEditing && existingEntry) {
      await updateEntry(existingEntry.id, { name: name.trim(), content: content.trim(), masked, updatedAt: now });
    } else {
      await addEntry({ id: generateId(), name: name.trim(), content: content.trim(), masked, createdAt: now, updatedAt: now });
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existingEntry) return;
    Alert.alert(t('entryEdit_deleteConfirmTitle'), t('entryEdit_deleteConfirmMessage', { name: existingEntry.name }), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('common_delete'), style: 'destructive', onPress: async () => { await deleteEntry(existingEntry.id); router.back(); } },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel={t('common_cancel')} accessibilityRole="button">
          <Text style={[styles.headerBtn, { color: theme.accent }]}>{t('common_cancel')}</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{isEditing ? t('entryEdit_editEntry') : t('entryEdit_newEntry')}</Text>
        <Pressable onPress={handleSave} accessibilityLabel={t('common_save')} accessibilityRole="button">
          <Text style={[styles.headerBtn, styles.headerBtnBold, { color: theme.accent }]}>{t('common_save')}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('entryEdit_entryName')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
          value={name} onChangeText={setName}
          placeholder={t('entryEdit_entryNamePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={t('entryEdit_entryName')}
        />

        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 20 }]}>{t('entryEdit_content')}</Text>
        <TextInput
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
          value={content} onChangeText={setContent}
          placeholder={t('entryEdit_contentPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          multiline textAlignVertical="top" autoCapitalize="none"
          accessibilityLabel={t('entryEdit_content')}
        />

        <View style={styles.maskRow}>
          <Text style={[styles.maskLabel, { color: theme.textSecondary }]}>{t('entryEdit_maskDisplay')}</Text>
          <Switch value={masked} onValueChange={setMasked}
            trackColor={{ false: theme.border, true: theme.accent }} accessibilityLabel={t('entryEdit_maskToggle')} />
        </View>

        {isEditing && (
          <Pressable onPress={handleDelete} style={[styles.deleteBtn, { borderColor: theme.danger }]}
            accessibilityLabel={t('entryEdit_deleteEntryLabel')} accessibilityRole="button">
            <Ionicons name="trash" size={18} color={theme.danger} />
            <Text style={[styles.deleteBtnText, { color: theme.danger }]}>{t('entryEdit_deleteEntry')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerBtn: { fontSize: 17 },
  headerBtnBold: { fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  input: { fontSize: 17, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  textArea: { fontSize: 16, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, minHeight: 150 },
  maskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  maskLabel: { fontSize: 14 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 32 },
  deleteBtnText: { fontSize: 15, fontWeight: '500' },
});
