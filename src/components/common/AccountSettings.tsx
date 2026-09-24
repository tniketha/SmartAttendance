import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useTheme, useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { Button } from './Button';
import { Card } from './Card';

export function AccountSettings() {
  const { Colors } = useTheme();
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const { mode, setMode } = useThemeStore();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const change = async () => {
    setLoading(true); setMessage('');
    try {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      await useAuthStore.getState().logout();
    } catch (e: any) { setMessage(e.response?.data?.error || 'Unable to change password. Please try again.'); }
    finally { setLoading(false); }
  };
  const input = { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14, color: Colors.textPrimary, marginTop: 8, minHeight: 48 };
  return <Card>
    <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Appearance & security</Text>
    <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>Choose a theme that is comfortable for you.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['system', 'light', 'dark'] as const).map(value => <Button key={value} title={`${mode === value ? '✓ ' : ''}${value[0].toUpperCase()}${value.slice(1)}`} variant={mode === value ? 'primary' : 'outline'} onPress={() => setMode(value)} />)}
    </View>
    {authenticated && <>
      <Text style={{ color: Colors.textPrimary, marginTop: 16, fontWeight: '600' }}>Change password</Text>
      <Text style={{ color: Colors.textSecondary, marginTop: 6 }}>Use at least 12 characters. Changing your password signs you out on all devices.</Text>
      <TextInput accessibilityLabel="Current password" placeholder="Current password" placeholderTextColor={Colors.textMuted} secureTextEntry autoCapitalize="none" value={currentPassword} onChangeText={setCurrent} style={input} />
      <TextInput accessibilityLabel="New password" placeholder="New password" placeholderTextColor={Colors.textMuted} secureTextEntry autoCapitalize="none" value={newPassword} onChangeText={setNew} style={input} />
      {!!message && <Text accessibilityRole="alert" style={{ color: Colors.absent, marginTop: 8 }}>{message}</Text>}
      <Button title="Update password" loading={loading} disabled={!currentPassword || newPassword.length < 12} onPress={change} />
    </>}
  </Card>;
}
