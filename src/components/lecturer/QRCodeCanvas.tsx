import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';

// react-native-qrcode-svg uses react-native-svg which works on Android/iOS/Web
// but the import must be guarded in case of bundling issues on some web configs
let QRCode: any = null;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch {
  QRCode = null;
}

interface Props {
  value: string;
  size?: number;
  countdownSeconds: number;
}

export const QRCodeCanvas: React.FC<Props> = ({
  value,
  size = 240,
  countdownSeconds,
}) => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const isUrgent = countdownSeconds <= 5;

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        {value && QRCode ? (
          <QRCode value={value} size={size} backgroundColor="white" color="#0F172A" />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size }]}>
            <Text style={styles.placeholderText}>
              {value ? '⚠️ QR unavailable on this platform' : 'Generating QR Code...'}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.timerContainer, isUrgent && styles.timerUrgent]}>
        <Text style={styles.timerLabel}>QR Rotates in:</Text>
        <View style={[styles.timerBadge, isUrgent && styles.timerBadgeUrgent]}>
          <Text style={styles.timerText}>
            {countdownSeconds < 10 ? `0${countdownSeconds}` : countdownSeconds}s
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  qrWrapper: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  placeholderText: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', padding: 8 },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerUrgent: { borderColor: Colors.absent },
  timerLabel: { fontSize: 14, color: Colors.textSecondary, marginRight: 8, fontWeight: '500' },
  timerBadge: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timerBadgeUrgent: { backgroundColor: Colors.absent },
  timerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
