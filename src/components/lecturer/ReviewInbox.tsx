import React, { useCallback, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { apiClient } from '../../api/client';
import { useTheme } from '../../store/themeStore';
export function ReviewInbox() {
  const { Colors } = useTheme();
  const [requests, setRequests] = useState<any[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { const r = await apiClient.get('/attendance/reviews'); setRequests(r.data.data.filter((v: any) => v.status === 'PENDING')); setError(''); }
    catch { setError('Unable to load review requests.'); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const decide = async (id: string, decision: string) => {
    setBusy(id);
    try { await apiClient.patch(`/attendance/reviews/${id}`, { decision, reason: reasons[id] }); await refresh(); }
    catch (e: any) { setError(e.response?.data?.error || 'Unable to save decision.'); }
    finally { setBusy(''); }
  };
  return <View style={{ marginVertical: 16 }}>
    <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary }}>Attendance reviews</Text>
    <Text style={{ color: Colors.textSecondary, marginVertical: 8 }}>Review student explanations and verify supporting evidence before approving.</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: Colors.absent }}>{error}</Text>}
    <Button title="Refresh requests" variant="outline" onPress={refresh} />
    {!requests.length && !error && <Text style={{ color: Colors.textSecondary }}>No pending requests.</Text>}
    {requests.map(r => <Card key={r.id}>
      <Text style={{ color: Colors.textPrimary, fontWeight: '700' }}>{r.attendanceRecord.student.user.name} · {r.attendanceRecord.session.module.moduleCode}</Text>
      <Text style={{ color: Colors.textSecondary, marginTop: 6 }}>{new Date(r.attendanceRecord.session.sessionDate).toLocaleDateString()} · {r.attendanceRecord.attendanceStatus} → {r.requestedStatus}</Text>
      <Text style={{ color: Colors.textPrimary, marginVertical: 12 }}>{r.reason}</Text>
      <TextInput accessibilityLabel="Review decision explanation" placeholder="Explain your decision" placeholderTextColor={Colors.textMuted} value={reasons[r.id] || ''} onChangeText={value => setReasons(prev => ({ ...prev, [r.id]: value }))} maxLength={1000} multiline style={{ color: Colors.textPrimary, borderColor: Colors.border, borderWidth: 1, padding: 12, borderRadius: 8, minHeight: 48 }} />
      <Button title="Approve correction" disabled={!!busy || (reasons[r.id]?.trim().length || 0) < 3} loading={busy === r.id} onPress={() => decide(r.id, 'APPROVED')} />
      <Button title="Decline request" variant="outline" disabled={!!busy || (reasons[r.id]?.trim().length || 0) < 3} onPress={() => decide(r.id, 'REJECTED')} />
    </Card>)}
  </View>;
}
