import { DataError } from '../../components/common/DataError';
import { useFocusEffect } from '@react-navigation/native';
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
import { SubjectProgressCard } from '../../components/student/SubjectProgressCard';
import { studentApi } from '../../api/student.api';
import { SubjectAttendanceStat } from '../../types/attendance.types';

export const AttendanceAnalyticsScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [data, setData] = useState<{
    overallPercentage: number;
    totalClasses: number;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    subjectWise: SubjectAttendanceStat[];
  } | null>(null);

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    setError(false);
    try {
      const res = await studentApi.getStatistics();
      setData(res);
    } catch (err) {
      setError(true);
      console.warn('Stats fetch error:', err);
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

  const getOverallColor = (pct: number) => {
    if (pct >= 80) return Colors.present;
    if (pct >= 65) return Colors.late;
    return Colors.absent;
  };

  const pct = data?.overallPercentage || 0;
  const overallColor = getOverallColor(pct);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Overall Score Card */}
      <Card style={styles.overallCard}>
        <Text style={styles.cardHeaderTitle}>Institute Attendance Standing</Text>
        <View style={styles.gaugeContainer}>
          <View style={[styles.circleGauge, { borderColor: overallColor }]}>
            <Text style={[styles.gaugeNumber, { color: overallColor }]}>{data?.totalClasses ? `${pct}%` : '—'}</Text>
            <Text style={styles.gaugeSub}>Cumulative</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryNumber}>{data?.totalClasses || 0}</Text>
            <Text style={styles.summaryLabel}>Total Classes</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryNumber, { color: Colors.present }]}>
              {data?.totalPresent || 0}
            </Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryNumber, { color: Colors.late }]}>
              {data?.totalLate || 0}
            </Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryNumber, { color: Colors.absent }]}>
              {data?.totalAbsent || 0}
            </Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
        </View>
      </Card>

      {/* Subject-Wise Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject-Wise Analytics</Text>
        {data?.subjectWise.map((stat) => (
          <SubjectProgressCard key={stat.moduleCode} stat={stat} />
        ))}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  gaugeContainer: {
    marginVertical: 10,
  },
  circleGauge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeNumber: {
    fontSize: 34,
    fontWeight: '900',
  },
  gaugeSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryCol: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
});
