import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { Button } from './Button';
export function DataError({ onRetry }: { onRetry: () => void }) {
  const { Colors } = useTheme();
  return <View style={{ flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
    <Text accessibilityRole="alert" style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary }}>Unable to load attendance</Text>
    <Text style={{ textAlign: 'center', marginVertical: 16, color: Colors.textSecondary }}>Check your connection and try again. Your saved records have not changed.</Text>
    <Button title="Try again" onPress={onRetry} />
  </View>;
}
