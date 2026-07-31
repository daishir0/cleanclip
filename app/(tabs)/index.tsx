import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, Text, TextInput, Pressable, StyleSheet, Alert, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useApp } from '@/contexts/AppContext';
import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import { useResponsive } from '@/hooks/use-responsive';
import { useT } from '@/i18n';
import { useToast } from '@/components/Toast';
import { EntryCard } from '@/components/EntryCard';
import { CopyFeedback } from '@/components/CopyFeedback';
import { DraggableFab } from '@/components/DraggableFab';
import { ClipEntry } from '@/types/clip';

const TABLET_MAX_WIDTH = 720;

export default function EntryListScreen() {
  const { entries, deleteEntry, reorderEntry, theme, syncEnabled, syncAvailable, triggerSync } = useApp();
  const { copiedText, showFeedback, triggerCopy } = useCopyFeedback();
  const { isTablet } = useResponsive();
  const tabBarHeight = useBottomTabBarHeight();
  const { t } = useT();
  const { showToast } = useToast();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!syncAvailable || !syncEnabled) return;
    setRefreshing(true);
    try {
      const result = await triggerSync();
      if (result.kind === 'ok') {
        showToast(t('toast_syncOk', { count: String(result.total) }), 'success');
      } else if (result.kind === 'keyMismatch') {
        showToast(t('toast_syncKeyMismatch'), 'error');
      } else if (result.kind === 'quotaExceeded') {
        showToast(t('toast_syncQuotaExceeded'), 'error');
      } else if (result.kind === 'error') {
        showToast(t('toast_syncError'), 'error');
      } else if (result.kind === 'unavailable') {
        showToast(t('toast_syncUnavailable'), 'error');
      }
    } finally {
      setRefreshing(false);
    }
  }, [syncAvailable, syncEnabled, triggerSync, showToast, t]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(e => e.name.toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleCopyAll = useCallback((entry: ClipEntry) => {
    triggerCopy(entry.content);
  }, [triggerCopy]);

  const handleDelete = useCallback((entry: ClipEntry) => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('entryList_deleteMessage', { name: entry.name }))) {
        deleteEntry(entry.id);
        if (expandedId === entry.id) setExpandedId(null);
      }
    } else {
      Alert.alert(t('entryList_deleteTitle'), t('entryList_deleteMessage', { name: entry.name }), [
        { text: t('common_cancel'), style: 'cancel' },
        { text: t('common_delete'), style: 'destructive', onPress: () => { deleteEntry(entry.id); if (expandedId === entry.id) setExpandedId(null); } },
      ]);
    }
  }, [deleteEntry, expandedId, t]);

  const handleEdit = useCallback((entry: ClipEntry) => {
    router.push({ pathname: '/entry-edit', params: { entryId: entry.id } });
  }, [router]);

  const handleMoveUp = useCallback((id: string) => {
    const idx = entries.findIndex(e => e.id === id);
    if (idx <= 0) return;
    const above = idx >= 2 ? entries[idx - 2] : null;
    const below = entries[idx - 1];
    reorderEntry(id, above, below);
  }, [entries, reorderEntry]);

  const handleMoveDown = useCallback((id: string) => {
    const idx = entries.findIndex(e => e.id === id);
    if (idx < 0 || idx >= entries.length - 1) return;
    const above = entries[idx + 1];
    const below = idx + 2 < entries.length ? entries[idx + 2] : null;
    reorderEntry(id, above, below);
  }, [entries, reorderEntry]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ClipEntry>) => (
    <EntryCard entry={item} isExpanded={expandedId === item.id}
      onToggle={() => handleToggle(item.id)} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)}
      onCopyWord={w => triggerCopy(w)} onCopyLine={l => triggerCopy(l)} onCopyJoined={j => triggerCopy(j)}
      onCopyAll={() => handleCopyAll(item)} drag={drag} isActive={isActive}
      onMoveUp={() => handleMoveUp(item.id)} onMoveDown={() => handleMoveDown(item.id)}
      isFirst={entries.indexOf(item) === 0} isLast={entries.indexOf(item) === entries.length - 1} />
  ), [expandedId, handleToggle, handleEdit, handleDelete, handleCopyAll, triggerCopy, handleMoveUp, handleMoveDown, entries]);

  const renderFlatItem = useCallback(({ item }: { item: ClipEntry }) => (
    <EntryCard entry={item} isExpanded={expandedId === item.id}
      onToggle={() => handleToggle(item.id)} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)}
      onCopyWord={w => triggerCopy(w)} onCopyLine={l => triggerCopy(l)} onCopyJoined={j => triggerCopy(j)}
      onCopyAll={() => handleCopyAll(item)}
      onMoveUp={() => handleMoveUp(item.id)} onMoveDown={() => handleMoveDown(item.id)}
      isFirst={entries.indexOf(item) === 0} isLast={entries.indexOf(item) === entries.length - 1} />
  ), [expandedId, handleToggle, handleEdit, handleDelete, handleCopyAll, triggerCopy, handleMoveUp, handleMoveDown, entries]);

  const handleDragEnd = useCallback(({ data, from, to }: { data: ClipEntry[]; from: number; to: number }) => {
    if (from === to) return;
    if (to < 0 || to >= data.length) return;
    const moved = data[to];
    const above = to > 0 ? data[to - 1] : null;
    const below = to < data.length - 1 ? data[to + 1] : null;
    reorderEntry(moved.id, above, below);
  }, [reorderEntry]);

  const refreshControl = syncAvailable && syncEnabled ? (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
  ) : undefined;

  const tabletWrapStyle = isTablet ? styles.tabletWrap : undefined;
  const listContentStyle = [styles.listContent, { paddingBottom: tabBarHeight + 96 }];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <CopyFeedback visible={showFeedback} text={copiedText} />
      <View style={[styles.innerWrap, tabletWrapStyle]}>
        {entries.length > 0 && (
          <View style={[styles.searchContainer, { backgroundColor: theme.bg }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <TextInput style={[styles.searchInput, { color: theme.text }]}
                value={searchQuery} onChangeText={setSearchQuery}
                placeholder={t('entryList_searchPlaceholder')} placeholderTextColor={theme.textSecondary}
                autoCapitalize="none" clearButtonMode="while-editing"
                accessibilityLabel={t('entryList_search')} />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        )}
        {filteredEntries.length === 0 && entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('entryList_empty')}</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('entryList_emptyHint')}</Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('entryList_noResults')}</Text>
          </View>
        ) : searchQuery.trim() ? (
          <FlatList data={filteredEntries} keyExtractor={item => item.id} renderItem={renderFlatItem}
            contentContainerStyle={listContentStyle}
            refreshControl={refreshControl}
          />
        ) : (
          <DraggableFlatList data={filteredEntries} keyExtractor={item => item.id} renderItem={renderItem}
            onDragEnd={handleDragEnd} contentContainerStyle={listContentStyle}
            refreshControl={refreshControl}
          />
        )}
      </View>
      <DraggableFab onPress={() => router.push('/entry-edit')}
        bottomInset={tabBarHeight} backgroundColor={theme.accent}
        accessibilityLabel={t('entryList_addEntry')}>
        <Ionicons name="add" size={28} color="#fff" />
      </DraggableFab>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerWrap: { flex: 1, width: '100%' },
  tabletWrap: { maxWidth: TABLET_MAX_WIDTH, alignSelf: 'center' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  clearBtn: { padding: 2 },
  listContent: { paddingVertical: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14 },
});
