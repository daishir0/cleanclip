import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';
import { WordChip } from '@/components/WordChip';

interface FieldRowProps {
  line: string;
  masked: boolean;
  onCopyWord: (word: string) => void;
  onCopyLine: (line: string) => void;
  onCopyJoined: (joined: string) => void;
}

export function FieldRow({ line, masked, onCopyWord, onCopyLine, onCopyJoined }: FieldRowProps) {
  const { theme } = useApp();
  const { t } = useT();
  const [revealed, setRevealed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const words = line.split(' ').filter(w => w.length > 0);
  const isMasked = masked && !revealed;

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const handleReveal = () => {
    setRevealed(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setRevealed(false); timeoutRef.current = null; }, 3000);
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <View style={styles.wordsContainer}>
        {words.map((word, idx) => (
          <WordChip key={idx} word={word} masked={isMasked} onCopy={onCopyWord} />
        ))}
        {masked && (
          <Pressable onPress={handleReveal} style={styles.revealButton}
            accessibilityLabel={revealed ? t('fieldRow_hide') : t('fieldRow_reveal')}
            accessibilityRole="button">
            <Ionicons name={revealed ? 'eye' : 'eye-off'} size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      <View style={styles.actionsRow}>
        <Pressable onPress={() => onCopyLine(line)}
          style={[styles.actionBtn, { backgroundColor: theme.bgTertiary }]}
          accessibilityLabel={t('fieldRow_copyLine')} accessibilityRole="button">
          <Text style={[styles.actionText, { color: theme.accent }]}>{t('fieldRow_line')}</Text>
        </Pressable>
        <Pressable onPress={() => onCopyJoined(line.replace(/\s+/g, ''))}
          style={[styles.actionBtn, { backgroundColor: theme.bgTertiary }]}
          accessibilityLabel={t('fieldRow_copyJoined')} accessibilityRole="button">
          <Text style={[styles.actionText, { color: theme.accent }]}>{t('fieldRow_joined')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  wordsContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  revealButton: { padding: 6, marginBottom: 6 },
  actionsRow: { flexDirection: 'row', marginTop: 4, gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
});
