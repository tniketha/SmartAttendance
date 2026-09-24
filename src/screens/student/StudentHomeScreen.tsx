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
import { studentApi, StudentDashboardResponse } from '../../api/student.api';
import { formatTime } from '../../utils/date.utils';

export const StudentHomeScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation<any>();

  const [data, setData] = useState<StudentDashboardResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setError(false);
    try {
      const res = await studentApi.getDashboard();
      setData(res);
    } catch (err) {
      setError(true);
      console.warn('Dashboard fetch error:', err);
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

  const getAttendanceColor = (pct: number) => {
    if (pct >= 80) return Colors.present;
    if (pct >= 65) return Colors.late;
    return Colors.absent;
  };

  if (error) return <DataError onRetry={fetchDashboard} />;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const stats = data?.stats;
  const todaySessions = data?.todaySessions || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Top Banner Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name}</Text>
        <Text style={styles.studentId}>
          ID: {user?.student?.studentNumber || 'Not provided'} • {user?.student?.programme}
        </Text>
      </View>

      <Button title="View attendance insights" variant="outline" onPress={() => navigation.navigate('AttendanceAnalytics')} />
      {/* Metrics Grid */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Attendance</Text>
          <Text
            style={[
              styles.statValue,
              { color: getAttendanceColor(stats?.overallPercentage || 0) },
            ]}
          >
            {stats?.totalClasses ? `${stats.overallPercentage}%` : '—'}
          </Text>
          <Text style={styles.statSub}>Overall Rate</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total Classes</Text>
          <Text style={styles.statValue}>{stats?.totalClasses || 0}</Text>
          <Text style={styles.statSub}>Conducted</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Present</Text>
          <Text style={[styles.statValue, { color: Colors.present }]}>
            {stats?.presentCount || 0}
          </Text>
          <Text style={styles.statSub}>Sessions</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Absent</Text>
          <Text style={[styles.statValue, { color: Colors.absent }]}>
            {stats?.absentCount || 0}
          </Text>
          <Text style={styles.statSub}>Missed</Text>
        </Card>
      </View>

      {/* Quick Action: Big Scan Button */}
      <View style={styles.scanSection}>
        <Button
          title="📷 Scan Attendance QR"
          onPress={() => navigation.navigate('QRScanner')}
          style={styles.mainScanBtn}
        />
      </View>

      {/* Today's Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>

        {todaySessions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes or sessions scheduled for today.</Text>
          </Card>
        ) : (
          todaySessions.map((session) => (
            <Card key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionCode}>{session.moduleCode}</Text>
                  <Text style={styles.sessionName}>{session.moduleName}</Text>
                </View>
                <Badge
                  label={session.status}
                  variant={session.status === 'ACTIVE' ? 'active' : 'closed'}
                />
              </View>

              <View style={styles.sessionDetails}>
                <Text style={styles.timeText}>
                  🕒 {formatTime(session.startTime)} – {formatTime(session.endTime)}
                </Text>
              </View>

              <View style={styles.sessionAction}>
                {session.hasMarked ? (
                  <View style={styles.markedBadge}>
                    <Text style={styles.markedText}>
                      ✓ Marked: {session.userAttendanceStatus}
                    </Text>
                  </View>
                ) : session.status === 'ACTIVE' ? (
                  <Button
                    title="Scan Now"
                    onPress={() => navigation.navigate('QRScanner')}
                    style={styles.sessionBtn}
                  />
                ) : (
                  <Text style={styles.closedText}>Session Closed</Text>
                )}
              </View>
            </Card>
          ))
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
  studentId: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -16,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 14,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  scanSection: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  mainScanBtn: {
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
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
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
  sessionDetails: {
    marginVertical: 8,
  },
  timeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sessionAction: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  sessionBtn: {
    height: 36,
    paddingHorizontal: 16,
  },
  markedBadge: {
    backgroundColor: Colors.presentBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markedText: {
    color: Colors.present,
    fontWeight: '700',
    fontSize: 13,
  },
  closedText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
