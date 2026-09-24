import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiClient } from '../api/client';
export async function exportAttendance(moduleId: string, moduleCode: string) {
  const response = await apiClient.get(`/reports/module/${moduleId}/export-csv`, { responseType: 'text' });
  const name = `attendance-${moduleCode.replace(/[^a-z0-9_-]/gi, '_')}.csv`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + response.data], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device');
    const path = FileSystem.cacheDirectory + name;
    try {
      await FileSystem.writeAsStringAsync(path, '\uFEFF' + response.data);
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } finally { await FileSystem.deleteAsync(path, { idempotent: true }); }
  }
}
