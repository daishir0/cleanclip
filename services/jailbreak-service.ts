import { Platform } from 'react-native';

const JAILBREAK_PATHS = [
  '/Applications/Cydia.app', '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash', '/usr/sbin/sshd', '/etc/apt', '/private/var/lib/apt', '/usr/bin/ssh',
];

export async function checkJailbreak(): Promise<{
  isJailbroken: boolean;
  isSipDisabled: boolean;
  messageKey: string; // translation key
}> {
  if (Platform.OS === 'web') {
    return { isJailbroken: false, isSipDisabled: false, messageKey: '' };
  }

  if (Platform.OS === 'ios') {
    try {
      for (const path of JAILBREAK_PATHS) {
        try {
          const FileSystem = await import('expo-file-system');
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            return { isJailbroken: true, isSipDisabled: false, messageKey: 'jailbreak_iosWarning' };
          }
        } catch { /* continue */ }
      }
    } catch { /* ignore */ }
    return { isJailbroken: false, isSipDisabled: false, messageKey: '' };
  }

  if (Platform.OS === 'android') {
    const rootPaths = ['/system/app/Superuser.apk', '/system/xbin/su', '/system/bin/su'];
    try {
      for (const path of rootPaths) {
        try {
          const FileSystem = await import('expo-file-system');
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            return { isJailbroken: true, isSipDisabled: false, messageKey: 'jailbreak_androidWarning' };
          }
        } catch { /* continue */ }
      }
    } catch { /* ignore */ }
  }

  return { isJailbroken: false, isSipDisabled: false, messageKey: '' };
}
