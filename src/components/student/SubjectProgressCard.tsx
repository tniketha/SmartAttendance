import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { SubjectAttendanceStat } from '../../types/attendance.types';

interface Props {
  stat: SubjectAttendanceStat;
}

export const SubjectProgressCard: React.FC<Props> = ({ stat }) => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return Colors.present;
    if (percentage >= 65) return Colors.late;
    return Colors.absent;
  };

  const progressColor = getProgressColor(stat.percentage);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.code}>{stat.moduleCode}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {stat.moduleName}
          </Text>
        </View>
        <View style={styles.percentageContainer}>
          <Text style={[styles.percentageText, { color: progressColor }]}>
            {stat.total ? `${stat.percentage}%` : '—'}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            { width: `${stat.total ? Math.min(stat.percentage, 100) : 0}%`, backgroundColor: progressColor },
          ]}
        />
      </View>

      {/* Metrics breakdown */}
      <View style={styles.metricsRow}>
        <Text style={styles.metricItem}>
          Classes: <Text style={styles.bold}>{stat.total}</Text>
        </Text>
        <Text style={styles.metricItem}>
          Present: <Text style={[styles.bold, { color: Colors.present }]}>{stat.present}</Text>
        </Text>
        <Text style={styles.metricItem}>
          Late: <Text style={[styles.bold, { color: Colors.late }]}>{stat.late}</Text>
        </Text>
        <Text style={styles.metricItem}>
          Absent: <Text style={[styles.bold, { color: Colors.absent }]}>{stat.absent}</Text>
        </Text>
      </View>
    </Card>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  code: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  percentageContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metricItem: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
  },
});
