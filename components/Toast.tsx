import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextType {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<any>(null);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setToast({ id: nextId++, message, kind });
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    hideTimer.current = setTimeout(animateOut, 2800);
  }, [opacity, translateY, animateOut]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastView toast={toast} opacity={opacity} translateY={translateY} onClose={animateOut} />}
    </ToastContext.Provider>
  );
}

function ToastView({
  toast,
  opacity,
  translateY,
  onClose,
}: {
  toast: ToastItem;
  opacity: Animated.Value;
  translateY: Animated.Value;
  onClose: () => void;
}) {
  let app: any = null;
  try {
    app = useApp();
  } catch {
  }
  const theme = app?.theme;
  const palette = theme ?? {
    bgTertiary: '#2c2c2e',
    text: '#fff',
    success: '#34C759',
    danger: '#FF3B30',
  };
  const bg = toast.kind === 'success' ? palette.success
    : toast.kind === 'error' ? palette.danger
    : palette.bgTertiary;
  const fg = toast.kind === 'info' ? palette.text : '#fff';
  const icon = toast.kind === 'success' ? 'checkmark-circle'
    : toast.kind === 'error' ? 'alert-circle'
    : 'information-circle';
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
    >
      <Pressable
        onPress={onClose}
        style={[styles.toast, { backgroundColor: bg }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name={icon as any} size={18} color={fg} />
        <Text style={[styles.text, { color: fg }]} numberOfLines={2}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: () => {} };
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 180,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
