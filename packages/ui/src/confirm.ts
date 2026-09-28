import { Alert, Platform } from 'react-native';

/** Cross-platform confirmation dialog (RN Alert buttons don't work on web). */
export function confirmAction(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Cross-platform text prompt; returns null when cancelled. Native falls back to a fixed default. */
export function promptText(title: string, message: string, fallback = ''): Promise<string | null> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.prompt(`${title}\n\n${message}`, fallback) : null);
  }
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => Alert.prompt(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      { text: 'OK', onPress: (v?: string) => resolve(v ?? '') },
    ], 'plain-text', fallback));
  }
  return confirmAction(title, message).then((ok) => (ok ? fallback : null));
}
