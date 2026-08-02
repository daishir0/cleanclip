import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
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
      {masked && (
        <Pressable onPress={handleReveal} style={styles.revealButton}
          accessibilityLabel={revealed ? t('fieldRow_hide') : t('fieldRow_reveal')}
          accessibilityRole="button">
          <Ionicons name={revealed ? 'eye' : 'eye-off'} size={18} color={theme.textSecondary} />
        </Pressable>
      )}
      <ScrollView horizontal style={styles.wordsScroll} contentContainerStyle={styles.wordsContent}
        showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
        {words.map((word, idx) => (
          <WordChip key={idx} word={word} masked={isMasked} onCopy={onCopyWord} />
        ))}
      </ScrollView>
      <Pressable
        onPress={() => onCopyLine(line)}
        onLongPress={() => onCopyJoined(line.replace(/\s+/g, ''))}
        style={[styles.copyBtn, { backgroundColor: theme.bgTertiary }]}
        accessibilityLabel={t('fieldRow_copyLine')}
        accessibilityHint={t('fieldRow_copyLongPressHint')}
        accessibilityRole="button">
        <Text style={[styles.copyBtnText, { color: theme.accent }]}>{t('fieldRow_copy')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  wordsScroll: { flex: 1 },
  wordsContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingBottom: 6 },
  revealButton: { padding: 6, marginRight: 2 },
  copyBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 6, marginLeft: 8 },
  copyBtnText: { fontSize: 13, fontWeight: '600' },
});
