import { Alert as NativeAlert, Platform, AlertButton } from 'react-native';
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') { NativeAlert.alert(title, message, buttons); return; }
    const text = [title, message].filter(Boolean).join('\n\n');
    const action = buttons?.find(b => b.style !== 'cancel');
    if (buttons?.some(b => b.style === 'cancel')) {
      if (window.confirm(text)) action?.onPress?.();
    } else { window.alert(text); action?.onPress?.(); }
  },
};
