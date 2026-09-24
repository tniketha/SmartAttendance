import { DataError } from '../../components/common/DataError';
import { useFocusEffect } from '@react-navigation/native';
import { AccountSettings } from '../../components/common/AccountSettings';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { adminApi } from '../../api/admin.api';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime } from '../../utils/date.utils';

export const AdminDashboardScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.getSystemStats();
      setStats(res);
    } catch (err) {
      setError(true);
      console.warn('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchStats(); }, [fetchStats]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (error) return <DataError onRetry={fetchStats} />;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>System Administration</Text>
        <Text style={styles.subtitle}>Smart Attendance Institute Control Panel</Text>
      </View>

      {/* Overview Metrics */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricVal}>{stats?.totalStudents || 0}</Text>
          <Text style={styles.metricLbl}>Total Students</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricVal}>{stats?.totalLecturers || 0}</Text>
          <Text style={styles.metricLbl}>Total Lecturers</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={styles.metricVal}>{stats?.totalModules || 0}</Text>
          <Text style={styles.metricLbl}>Active Modules</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: Colors.present }]}>
            {stats?.overallAttendanceRate || 0}%
          </Text>
          <Text style={styles.metricLbl}>Overall Attendance</Text>
        </Card>
      </View>

      {/* Audit Logs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Attendance Audit Logs</Text>
        <Text style={styles.sectionSubtitle}>
          Modifications made manually by lecturers or administrators
        </Text>

        {stats?.recentAudits && stats.recentAudits.length > 0 ? (
          stats.recentAudits.map((a: any) => (
            <Card key={a.id} style={styles.auditCard}>
              <View style={styles.auditHeader}>
                <Text style={styles.studentInfo}>
                  {a.studentNumber} – {a.studentName}
                </Text>
                <Text style={styles.moduleCode}>{a.moduleCode}</Text>
              </View>

              <View style={styles.statusChangeRow}>
                <Text style={styles.statusOld}>{a.oldStatus}</Text>
                <Text style={styles.arrow}> ➔ </Text>
                <Text style={styles.statusNew}>{a.newStatus}</Text>
              </View>

              <Text style={styles.reason}>
                <Text style={styles.bold}>Reason:</Text> {a.reason}
              </Text>

              <View style={styles.auditFooter}>
                <Text style={styles.auditBy}>Modified by: {a.changedBy}</Text>
                <Text style={styles.auditTime}>{formatDateTime(a.changedAt)}</Text>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No audit logs recorded yet.</Text>
          </Card>
        )}
      </View>

      <View style={styles.logoutSection}>
        <Button title="Sign Out" variant="danger" onPress={logout} />
      </View>
      <AccountSettings />
    </ScrollView>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 14,
    marginVertical: 4,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  metricLbl: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  auditCard: {
    marginVertical: 4,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  studentInfo: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  moduleCode: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  statusOld: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.absent,
  },
  arrow: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  statusNew: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.present,
  },
  reason: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginVertical: 4,
  },
  bold: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  auditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
    marginTop: 6,
  },
  auditBy: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  auditTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  logoutSection: {
    marginVertical: 20,
    marginBottom: 40,
  },
});
