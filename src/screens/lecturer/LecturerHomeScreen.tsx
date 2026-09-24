import { DataError } from '../../components/common/DataError';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { lecturerApi } from '../../api/lecturer.api';
import { LecturerDashboardData } from '../../types/attendance.types';
import { formatTime } from '../../utils/date.utils';

export const LecturerHomeScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation<any>();

  const [data, setData] = useState<LecturerDashboardData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setError(false);
    try {
      const res = await lecturerApi.getDashboard();
      setData(res);
    } catch (err) {
      setError(true);
      console.warn('Lecturer dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchDashboard(); }, [fetchDashboard]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (error) return <DataError onRetry={fetchDashboard} />;

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
      {/* Top Banner Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Day, {user?.name}</Text>
        <Text style={styles.lecturerId}>
          {user?.lecturer?.title || 'Lecturer'} • {user?.lecturer?.employeeNumber} •{' '}
          {user?.lecturer?.department}
        </Text>
      </View>

      {/* Metrics Row */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Modules</Text>
          <Text style={styles.statValue}>{data?.totalModules || 0}</Text>
          <Text style={styles.statSub}>Assigned</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Today's Sessions</Text>
          <Text style={styles.statValue}>{data?.todaySessionsCount || 0}</Text>
          <Text style={styles.statSub}>Conducted</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Avg. Attendance</Text>
          <Text style={[styles.statValue, { color: Colors.present }]}>
            {data?.averageAttendanceRate || 0}%
          </Text>
          <Text style={styles.statSub}>Overall Rate</Text>
        </Card>
      </View>

      {/* Primary Action Button */}
      <View style={styles.actionContainer}>
        <Button
          title="⚡ Start New Attendance Session"
          onPress={() => navigation.navigate('StartSession')}
          style={styles.startBtn}
        />
      </View>

      {/* Today's Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance Sessions</Text>

        {data?.todaySessions && data.todaySessions.length > 0 ? (
          data.todaySessions.map((session) => (
            <Card key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionCode}>{session.moduleCode}</Text>
                  <Text style={styles.sessionName}>{session.moduleName}</Text>
                  <Text style={styles.sessionRef}>{session.sessionCode}</Text>
                </View>
                <Badge
                  label={session.status}
                  variant={session.status === 'ACTIVE' ? 'active' : 'closed'}
                />
              </View>

              <View style={styles.sessionMeta}>
                <Text style={styles.metaText}>
                  🕒 {formatTime(session.startTime)} – {formatTime(session.endTime)}
                </Text>
                <Text style={styles.metaText}>
                  👥 Scanned: <Text style={styles.bold}>{session.totalScanned}</Text>
                </Text>
              </View>

              {session.status === 'ACTIVE' ? (
                <Button
                  title="Open Live QR & Roster"
                  onPress={() =>
                    navigation.navigate('ActiveQR', {
                      sessionId: session.id,
                      moduleCode: session.moduleCode,
                      moduleName: session.moduleName,
                    })
                  }
                  style={styles.openSessionBtn}
                />
              ) : null}
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No attendance sessions started yet today.</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lecturerId: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -16,
  },
  statCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  statSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  startBtn: {
    height: 52,
    borderRadius: 12,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  sessionCard: {
    marginVertical: 6,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionCode: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  sessionRef: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  openSessionBtn: {
    height: 38,
    marginTop: 10,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
