import React, { useEffect, useState } from 'react';
import { View, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function PrivacyOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Prevent screen capture on iOS/iPadOS only
    if (Platform.OS === 'ios') {
      (async () => {
        const ScreenCapture = await import('expo-screen-capture');
        ScreenCapture.preventScreenCaptureAsync();
      })();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      if (Platform.OS === 'ios') {
        (async () => {
          const ScreenCapture = await import('expo-screen-capture');
          ScreenCapture.allowScreenCaptureAsync();
        })();
      }
    };
  }, []);

  const handleAppStateChange = (state: AppStateStatus) => {
    setShowOverlay(state === 'inactive' || state === 'background');
  };

  if (!showOverlay) return null;

  return (
    <View style={styles.overlay}>
      <Ionicons name="lock-closed" size={48} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
