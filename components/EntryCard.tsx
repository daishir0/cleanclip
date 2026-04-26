import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ClipEntry } from '@/types/clip';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';
import { FieldRow } from '@/components/FieldRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EntryCardProps {
  entry: ClipEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyWord: (word: string) => void;
  onCopyLine: (line: string) => void;
  onCopyJoined: (joined: string) => void;
  onCopyAll: () => void;
  drag?: () => void;
  isActive?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function EntryCard({
  entry, isExpanded, onToggle, onEdit, onDelete,
  onCopyWord, onCopyLine, onCopyJoined, onCopyAll, drag, isActive,
  onMoveUp, onMoveDown, isFirst, isLast,
}: EntryCardProps) {
  const { theme } = useApp();
  const { t } = useT();
  const swipeableRef = useRef<Swipeable>(null);
  const lines = entry.content.split('\n').filter(l => l.length > 0);

  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    onToggle();
  };

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.5], extrapolate: 'clamp' });
    return (
      <Pressable onPress={() => { swipeableRef.current?.close(); onDelete(); }}
        style={[styles.swipeAction, { backgroundColor: theme.danger }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={22} color="#fff" />
        </Animated.View>
      </Pressable>
    );
  };

  const renderLeftActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [0, 80], outputRange: [0.5, 1], extrapolate: 'clamp' });
    return (
      <Pressable onPress={() => { swipeableRef.current?.close(); onEdit(); }}
        style={[styles.swipeAction, { backgroundColor: theme.accent }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="pencil" size={22} color="#fff" />
        </Animated.View>
      </Pressable>
    );
  };

  const cardContent = (
    <View>
      <View style={[styles.card, { backgroundColor: isActive ? theme.bgTertiary : theme.bgSecondary, borderColor: theme.border }]}
        accessibilityLabel={t('entryCard_entry', { name: entry.name })}>
        <Pressable onPress={handleToggle} onLongPress={drag} delayLongPress={200} style={styles.header}>
          <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={18} color={theme.textSecondary} />
          {Platform.OS === 'web' && onMoveUp && onMoveDown && (
            <View style={styles.reorderBtns}>
              <Pressable onPress={isFirst ? undefined : onMoveUp} style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
                accessibilityLabel="Move up" accessibilityRole="button">
                <Ionicons name="chevron-up" size={18} color={isFirst ? theme.border : theme.textSecondary} />
              </Pressable>
              <Pressable onPress={isLast ? undefined : onMoveDown} style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
                accessibilityLabel="Move down" accessibilityRole="button">
                <Ionicons name="chevron-down" size={18} color={isLast ? theme.border : theme.textSecondary} />
              </Pressable>
            </View>
          )}
          {entry.localOnly && (
            <View accessibilityLabel={t('entryCard_localOnlyBadge')} style={styles.localBadge}>
              <Ionicons name="shield-checkmark" size={14} color={theme.success} />
            </View>
          )}
          <Text style={[styles.entryName, { color: theme.text }]} numberOfLines={1}>{entry.name}</Text>
          <Pressable onPress={onEdit} style={styles.headerIconBtn}
            accessibilityLabel={t('entryCard_edit')} accessibilityRole="button">
            <Ionicons name="pencil" size={16} color={theme.accent} />
          </Pressable>
          <Pressable onPress={onCopyAll} style={[styles.copyAllBtn, { backgroundColor: theme.accent }]}
            accessibilityLabel={t('entryCard_copyAll')} accessibilityHint={t('entryCard_copyAllHint')} accessibilityRole="button">
            <Text style={styles.copyAllText}>{t('entryCard_copyAll')}</Text>
          </Pressable>
        </Pressable>
      </View>
      {isExpanded && (
        <View style={[styles.expandedContent, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
          {lines.map((line, index) => (
            <FieldRow key={index} line={line} masked={entry.masked} onCopyWord={onCopyWord} onCopyLine={onCopyLine} onCopyJoined={onCopyJoined} />
          ))}
          <Pressable onPress={onDelete} style={styles.deleteBtn}
            accessibilityLabel={t('entryCard_delete')} accessibilityRole="button">
            <Ionicons name="trash" size={16} color={theme.danger} />
            <Text style={[styles.deleteBtnText, { color: theme.danger }]}>{t('entryCard_delete')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'web' || isExpanded) {
    return cardContent;
  }

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} renderLeftActions={renderLeftActions}
      overshootRight={false} overshootLeft={false} friction={2}>
      {cardContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginHorizontal: 16, marginVertical: 6, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  entryName: { flex: 1, fontSize: 17, fontWeight: '600' },
  reorderBtns: { flexDirection: 'column', gap: 0 },
  reorderBtn: { padding: 2 },
  reorderBtnDisabled: { opacity: 0.3 },
  headerIconBtn: { padding: 6 },
  localBadge: { padding: 2 },
  copyAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  copyAllText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  expandedContent: { paddingHorizontal: 14, paddingBottom: 14, marginHorizontal: 16, marginTop: -6, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderTopWidth: 0 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8, borderRadius: 8 },
  deleteBtnText: { fontSize: 14, fontWeight: '500' },
  swipeAction: { justifyContent: 'center', alignItems: 'center', width: 70, marginVertical: 6 },
});
