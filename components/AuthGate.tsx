import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState, AppStateStatus, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/i18n';
import { authenticate, checkBiometricAvailability } from '@/services/auth-service';
import { checkJailbreak } from '@/services/jailbreak-service';

const BACKGROUND_LOCK_THRESHOLD_MS = 30_000;

interface AuthGateProps { children: React.ReactNode; }

export function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated, setAuthenticated, theme, loaded } = useApp();
  const { t } = useT();
  const [failCount, setFailCount] = useState(0);
  const [checking, setChecking] = useState(true);
  const [biometricType, setBiometricType] = useState('');
  const lastActiveRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      const jb = await checkJailbreak();
      if (jb.isJailbroken || jb.isSipDisabled) {
        Alert.alert(t('jailbreak_securityWarning'), t(jb.messageKey as any), [{ text: t('common_ok') }]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const status = await checkBiometricAvailability();
      setBiometricType(status.biometricType ? t(status.biometricType as any) : '');
      if (!status.isAvailable || !status.isEnrolled) {
        setAuthenticated(true); setChecking(false); return;
      }
      await doAuthenticate();
      setChecking(false);
    })();
  }, [loaded]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);

  const handleAppStateChange = (nextState: AppStateStatus) => {
    const prevState = appStateRef.current;
    appStateRef.current = nextState;
    if (prevState === 'active' && (nextState === 'background' || nextState === 'inactive')) {
      lastActiveRef.current = Date.now();
    }
    if (nextState === 'active' && prevState !== 'active') {
      if (Date.now() - lastActiveRef.current > BACKGROUND_LOCK_THRESHOLD_MS && isAuthenticated) {
        setAuthenticated(false); setFailCount(0); doAuthenticate();
      }
    }
  };

  const doAuthenticate = async () => {
    const result = await authenticate({
      promptMessage: t('auth_prompt'),
      fallbackLabel: t('auth_fallback'),
      cancelLabel: t('common_cancel'),
    });
    if (result.success) { setAuthenticated(true); setFailCount(0); }
    else { setFailCount(prev => prev + 1); }
  };

  if (!loaded || checking) {
    return <View style={[styles.container, { backgroundColor: theme.bg }]}><Ionicons name="lock-closed" size={48} color={theme.textSecondary} /></View>;
  }

  if (isAuthenticated) return <>{children}</>;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Ionicons name="lock-closed" size={64} color={theme.accent} />
      <Text style={[styles.title, { color: theme.text }]}>CleanClip</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {failCount >= 3 ? t('auth_unlockPasscode') : t('auth_unlockBiometric', { type: biometricType || t('auth_defaultBiometric') })}
      </Text>
      <Pressable onPress={doAuthenticate} style={[styles.unlockBtn, { backgroundColor: theme.accent }]}
        accessibilityLabel={t('auth_unlock')} accessibilityRole="button">
        <Text style={styles.unlockBtnText}>{t('auth_unlock')}</Text>
      </Pressable>
      {failCount > 0 && failCount < 3 && (
        <Text style={[styles.failText, { color: theme.danger }]}>{t('auth_failCount', { count: failCount })}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 15, textAlign: 'center' },
  unlockBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  unlockBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  failText: { fontSize: 13, marginTop: 8 },
});
