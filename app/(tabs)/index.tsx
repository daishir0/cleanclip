import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, FlatList, Text, TextInput, Pressable, StyleSheet, Alert, Platform, RefreshControl, LayoutAnimation } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { groupByCategory } from '@/utils/categories';

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
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set());

  const { uncategorized, categories } = useMemo(() => groupByCategory(entries), [entries]);

  // Spotlight tap lands here with ?focusId=<entry id>: expand the entry (and its category).
  const { focusId } = useLocalSearchParams<{ focusId?: string }>();
  const consumedFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof focusId !== 'string' || !focusId) return;
    if (consumedFocusRef.current === focusId) return;
    const entry = entries.find(e => e.id === focusId);
    if (!entry) return;
    consumedFocusRef.current = focusId;
    setSearchQuery('');
    setExpandedId(focusId);
    const cat = entry.category?.trim();
    if (cat) setOpenCategories(prev => new Set(prev).add(cat));
  }, [focusId, entries]);

  const toggleCategory = useCallback((name: string) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

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

  const moveInList = useCallback((list: ClipEntry[], id: string, dir: -1 | 1) => {
    const idx = list.findIndex(e => e.id === id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= list.length) return;
    if (dir === -1) {
      const above = to >= 1 ? list[to - 1] : null;
      reorderEntry(id, above, list[to]);
    } else {
      const below = to + 1 < list.length ? list[to + 1] : null;
      reorderEntry(id, list[to], below);
    }
  }, [reorderEntry]);

  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<ClipEntry>) => (
    <EntryCard entry={item} isExpanded={expandedId === item.id}
      onToggle={() => handleToggle(item.id)} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)}
      onCopyWord={w => triggerCopy(w)} onCopyLine={l => triggerCopy(l)} onCopyJoined={j => triggerCopy(j)}
      onCopyAll={() => handleCopyAll(item)} drag={drag} isActive={isActive}
      onMoveUp={() => moveInList(uncategorized, item.id, -1)} onMoveDown={() => moveInList(uncategorized, item.id, 1)}
      isFirst={uncategorized.indexOf(item) === 0} isLast={uncategorized.indexOf(item) === uncategorized.length - 1} />
  ), [expandedId, handleToggle, handleEdit, handleDelete, handleCopyAll, triggerCopy, moveInList, uncategorized]);

  const renderFlatItem = useCallback(({ item }: { item: ClipEntry }) => (
    <EntryCard entry={item} isExpanded={expandedId === item.id}
      onToggle={() => handleToggle(item.id)} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)}
      onCopyWord={w => triggerCopy(w)} onCopyLine={l => triggerCopy(l)} onCopyJoined={j => triggerCopy(j)}
      onCopyAll={() => handleCopyAll(item)}
      isFirst isLast />
  ), [expandedId, handleToggle, handleEdit, handleDelete, handleCopyAll, triggerCopy]);

  const renderCategorySections = useCallback(() => {
    if (categories.length === 0) return null;
    return (
      <View>
        {categories.map(cat => {
          const open = openCategories.has(cat.name);
          return (
            <View key={cat.name}>
              <Pressable onPress={() => toggleCategory(cat.name)}
                style={[styles.categoryHeader, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel={t('entryList_categoryToggle', { name: cat.name })}
                accessibilityState={{ expanded: open }}>
                <Ionicons name={open ? 'folder-open' : 'folder'} size={18} color={theme.accent} />
                <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>{cat.name}</Text>
                <View style={[styles.categoryCount, { backgroundColor: theme.bgTertiary }]}>
                  <Text style={[styles.categoryCountText, { color: theme.textSecondary }]}>{cat.entries.length}</Text>
                </View>
                <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={theme.textSecondary} />
              </Pressable>
              {open && cat.entries.map(item => (
                <EntryCard key={item.id} entry={item} isExpanded={expandedId === item.id}
                  onToggle={() => handleToggle(item.id)} onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item)}
                  onCopyWord={w => triggerCopy(w)} onCopyLine={l => triggerCopy(l)} onCopyJoined={j => triggerCopy(j)}
                  onCopyAll={() => handleCopyAll(item)}
                  onMoveUp={() => moveInList(cat.entries, item.id, -1)} onMoveDown={() => moveInList(cat.entries, item.id, 1)}
                  isFirst={cat.entries[0].id === item.id} isLast={cat.entries[cat.entries.length - 1].id === item.id} />
              ))}
            </View>
          );
        })}
      </View>
    );
  }, [categories, openCategories, toggleCategory, theme, t, expandedId, handleToggle, handleEdit, handleDelete, handleCopyAll, triggerCopy, moveInList]);

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
          <DraggableFlatList data={uncategorized} keyExtractor={item => item.id} renderItem={renderItem}
            onDragEnd={handleDragEnd} contentContainerStyle={listContentStyle}
            refreshControl={refreshControl}
            ListFooterComponent={renderCategorySections}
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
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 6, padding: 14,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  categoryName: { flex: 1, fontSize: 17, fontWeight: '600' },
  categoryCount: { minWidth: 24, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 11, alignItems: 'center' },
  categoryCountText: { fontSize: 13, fontWeight: '600' },
});
