import { AccountSettings } from '../../components/common/AccountSettings';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';

export const LecturerProfileScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'LC'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Faculty Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee Number</Text>
          <Text style={styles.infoValue}>{user?.lecturer?.employeeNumber || 'Not provided'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>
            {user?.lecturer?.department || 'Not provided'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Academic Title</Text>
          <Text style={styles.infoValue}>{user?.lecturer?.title || 'Not provided'}</Text>
        </View>
      </Card>

      <AccountSettings />
      <View style={styles.logoutContainer}>
        <Button
          title="Sign Out"
          variant="danger"
          onPress={logout}
          style={styles.logoutBtn}
        />
      </View>
    </ScrollView>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoCard: {
    marginVertical: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  logoutContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  logoutBtn: {
    borderRadius: 12,
  },
});
