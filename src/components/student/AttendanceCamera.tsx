import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from '../common/Button';
export interface CameraProps { active: boolean; disabled: boolean; onScan: (value: { data: string }) => void; onError: (message: string) => void; }
export function AttendanceCamera({ active, disabled, onScan, onError }: CameraProps) {
  const [permission, request] = useCameraPermissions();
  if (!active) return null;
  if (!permission?.granted) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, zIndex: 2, backgroundColor: '#0B1220' }}>
    <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>Allow camera access to scan your classroom QR code. If access was blocked, enable it in device settings.</Text>
    <Button title="Allow camera" onPress={() => { void request().catch(() => onError('Camera permission could not be requested.')); }} />
  </View>;
  return <CameraView style={StyleSheet.absoluteFillObject} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={disabled ? undefined : onScan} onMountError={() => onError('Camera unavailable. Check device permissions.')} />;
}
