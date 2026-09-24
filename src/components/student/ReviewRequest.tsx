import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Button } from '../common/Button';
import { apiClient } from '../../api/client';
import { useTheme } from '../../store/themeStore';
import { AttendanceRecord } from '../../types/attendance.types';
export function ReviewRequest({ record, onSaved }: { record: AttendanceRecord; onSaved: () => void }) {
  const { Colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('EXCUSED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setLoading(true); setError('');
    try { await apiClient.post('/attendance/reviews', { recordId: record.id, requestedStatus: status, reason }); setOpen(false); onSaved(); }
    catch (e: any) { setError(e.response?.data?.error || 'Unable to send request. Please retry.'); }
    finally { setLoading(false); }
  };
  if (record.review) return <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Review: {record.review.status.toLowerCase()}{record.review.decisionReason ? ` — ${record.review.decisionReason}` : ''}</Text>;
  if (!open) return <Button title="Request a correction" variant="outline" onPress={() => setOpen(true)} />;
  return <View style={{ marginTop: 12 }}>
    <Text style={{ color: Colors.textPrimary }}>Explain what happened. Your lecturer will review this request after the class closes.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{['EXCUSED', 'PRESENT', 'LATE'].filter(s => s !== record.status).map(s => <Button key={s} title={s.toLowerCase()} variant={status === s ? 'primary' : 'outline'} onPress={() => setStatus(s)} />)}</View>
    <TextInput accessibilityLabel="Reason for attendance correction" placeholder="Reason (at least 10 characters)" placeholderTextColor={Colors.textMuted} value={reason} onChangeText={setReason} multiline maxLength={1000} style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, minHeight: 80, color: Colors.textPrimary }} />
    {!!error && <Text accessibilityRole="alert" style={{ color: Colors.absent }}>{error}</Text>}
    <Button title="Send to lecturer" loading={loading} disabled={reason.trim().length < 10 || status === record.status} onPress={submit} />
    <Button title="Cancel" variant="outline" disabled={loading} onPress={() => setOpen(false)} />
  </View>;
}
