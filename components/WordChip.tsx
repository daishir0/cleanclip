import React, { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';

interface WordChipProps {
  word: string;
  masked?: boolean;
  onCopy: (word: string) => void;
}

export function WordChip({ word, masked, onCopy }: WordChipProps) {
  const { theme } = useApp();
  const { t } = useT();
  const [pressed, setPressed] = useState(false);
  const displayText = masked ? '\u2022\u2022\u2022\u2022' : word;

  return (
    <Pressable
      onPress={() => onCopy(word)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.chip,
        { backgroundColor: pressed ? theme.accent : theme.bgTertiary, borderColor: theme.border },
      ]}
      accessibilityLabel={masked ? t('wordChip_copyMasked') : t('wordChip_copy', { word })}
      accessibilityHint={t('wordChip_tapHint')}
      accessibilityRole="button"
    >
      <Text style={[styles.chipText, { color: pressed ? '#fff' : theme.text }]}>
        {displayText}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, marginRight: 6, marginBottom: 6,
  },
  chipText: { fontSize: 15, fontFamily: 'System' },
});
