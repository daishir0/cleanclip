import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '@/i18n';

interface CopyFeedbackProps {
  visible: boolean;
  text: string | null;
}

export function CopyFeedback({ visible, text }: CopyFeedbackProps) {
  const { t } = useT();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible, text]);

  if (!visible) return null;

  const displayText = text && text.length > 30 ? text.substring(0, 30) + '...' : text;
  const message = displayText
    ? t('copyFeedback_withText', { text: displayText })
    : t('copyFeedback_generic');

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.box}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.text} numberOfLines={1}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  box: {
    backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    maxWidth: '80%',
  },
  text: { color: '#fff', fontSize: 14, flexShrink: 1 },
});
