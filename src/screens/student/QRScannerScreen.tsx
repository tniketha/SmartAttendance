import { Alert } from '../../utils/alert.utils';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Button } from '../../components/common/Button';
import { studentApi, ScanAttendanceResponse } from '../../api/student.api';
import { formatTime } from '../../utils/date.utils';

import { AttendanceCamera } from '../../components/student/AttendanceCamera';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';

export const QRScannerScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const navigation = useNavigation<any>();
  const isWeb = Platform.OS === 'web';

  const focused = useIsFocused();
  const scanLock = useRef(false);
  const [scanError, setScanError] = useState('');

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanAttendanceResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLock.current || scanned || loading) return;
    scanLock.current = true;
    setScanError('');

    setScanned(true);
    setLoading(true);

    try {
      let coords: { latitude?: number; longitude?: number; accuracy?: number; locationTimestamp?: number; mocked?: boolean } = {};
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') throw new Error('Location permission denied');
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined, locationTimestamp: loc.timestamp, mocked: loc.mocked,
        };
      } catch (locErr) {
        console.log('Location not available, proceeding without GPS:', locErr);
      }

      const res = await studentApi.scanAttendance({
        qrToken: data,
        ...coords,
      });

      setResult(res);
      setModalVisible(true);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || 'Failed to record attendance. Please try scanning again.';
      setScanError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    scanLock.current = false;
    setModalVisible(false);
    setResult(null);
    setScanned(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <AttendanceCamera active={focused && !modalVisible} disabled={scanned} onScan={handleBarcodeScanned} onError={setScanError} />

      {/* Viewfinder Overlay */}
      <View style={styles.overlay}>
        <View style={styles.topMask}>
          <Text style={styles.scanInstruction}>Place the QR code inside the frame</Text>
        </View>

        <View style={styles.centerRow}>
          <View style={styles.sideMask} />
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Validating attendance...</Text>
              </View>
            )}
          </View>
          <View style={styles.sideMask} />
        </View>

        <View style={styles.bottomMask}>
          {!!scanError && <Text accessibilityRole="alert" style={{ color: '#FFFFFF', textAlign: 'center', padding: 16 }}>{scanError}</Text>}
          {scanned && !modalVisible && !loading && (
            <Button
              title="Tap to Scan Again"
              onPress={() => { scanLock.current = false; setScanned(false); setScanError(''); }}
              style={styles.rescanBtn}
            />
          )}
        </View>
      </View>

      {/* Success Confirmation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={handleDone}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.checkBadge}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>

            <Text style={styles.modalTitle}>Attendance Recorded!</Text>

            <View style={styles.modalDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Module:</Text>
                <Text style={styles.detailValue}>
                  {result?.moduleCode} – {result?.moduleName}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>
                  {result?.scannedAt ? formatTime(result.scannedAt) : 'Just now'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: result?.status === 'PRESENT' ? Colors.present : Colors.late,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {result?.status}
                </Text>
              </View>
            </View>

            <Button title="Done" onPress={handleDone} style={styles.modalBtn} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  webIcon: { fontSize: 48, marginBottom: 12 },
  webTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  centerRow: { flexDirection: 'row', height: 260 },
  sideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  targetFrame: {
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#3B82F6' },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  loadingBox: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: { color: '#FFFFFF', fontSize: 13, marginTop: 8 },
  bottomMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  rescanBtn: { width: 200 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  checkBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.presentBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkIcon: { fontSize: 32, color: Colors.present, fontWeight: '900' },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  modalBtn: { width: '100%' },
});
