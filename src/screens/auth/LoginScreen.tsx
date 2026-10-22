import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Button } from '../../components/common/Button';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { BrandLogo } from '../../components/common/BrandLogo';
import { InstitutionIdentity } from '../../components/common/InstitutionIdentity';

export const LoginScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (idToUse?: string, pwdToUse?: string) => {
    if (loading) return;
    setError('');
    const id = idToUse || identifier;
    const pwd = pwdToUse || password;

    if (!id.trim() || !pwd.trim()) {
      setError('Please enter your email or student ID and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.login(id.trim(), pwd);
      await login(res.accessToken, res.refreshToken, res.user);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to log in. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo size={80} />
          <Text style={styles.appTitle}>Smart Attendance</Text>
          <InstitutionIdentity centered />
          <Text style={styles.subtitle}>Every class. Every check-in. Connected.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formDescription}>Use your university account to continue.</Text>

          <Text style={styles.label}>Email or Student / Employee ID</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Email or student or employee ID"
            autoComplete="username"
            placeholder="Email or institutional ID"
            placeholderTextColor={Colors.textMuted}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Password"
            autoComplete="current-password"
            onSubmitEditing={() => handleLogin()}
            secureTextEntry
          />

          {!!error && <Text accessibilityRole="alert" style={{ color: Colors.absent, marginTop: 12 }}>{error}</Text>}
          <Button
            title="Sign In"
            onPress={() => handleLogin()}
            loading={loading}
            style={styles.loginButton}
          />
        </View>
        <Text style={styles.footer}>Built for students, lecturers and administrators.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appTitle: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  formDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  loginButton: {
    marginTop: 20,
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
    marginTop: 24,
    textAlign: 'center',
  },
});
