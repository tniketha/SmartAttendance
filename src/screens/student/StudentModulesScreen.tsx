import { DataError } from '../../components/common/DataError';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { studentApi } from '../../api/student.api';

export const StudentModulesScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [modules, setModules] = useState<any[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchModules = useCallback(async () => {
    setError(false);
    try {
      const res = await studentApi.getModules();
      setModules(res);
    } catch (err) {
      setError(true);
      console.warn('Failed to fetch modules:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchModules(); }, [fetchModules]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchModules();
  };

  if (error) return <DataError onRetry={fetchModules} />;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={modules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.moduleCode}>{item.moduleCode}</Text>
              <Text style={styles.percentage}>{item.stats.total ? `${item.stats.percentage}%` : '—'}</Text>
            </View>
            <Text style={styles.moduleName}>{item.moduleName}</Text>
            <Text style={styles.lecturer}>Lecturer: {item.lecturerName}</Text>
            <Text style={styles.department}>Department: {item.department}</Text>
            <View style={styles.divider} />
            <View style={styles.statsRow}>
              <Text style={styles.stat}>Classes: {item.stats.total}</Text>
              <Text style={[styles.stat, { color: Colors.present }]}>
                Present: {item.stats.present}
              </Text>
              <Text style={[styles.stat, { color: Colors.late }]}>
                Late: {item.stats.late}
              </Text>
              <Text style={[styles.stat, { color: Colors.absent }]}>
                Absent: {item.stats.absent}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
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
  list: {
    padding: 16,
  },
  card: {
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  percentage: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  lecturer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  department: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
