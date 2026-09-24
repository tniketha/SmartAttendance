import { DataError } from '../../components/common/DataError';
import { useFocusEffect } from '@react-navigation/native';
import { ReviewRequest } from '../../components/student/ReviewRequest';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { AttendanceStatusBadge } from '../../components/student/AttendanceStatusBadge';
import { studentApi } from '../../api/student.api';
import { AttendanceRecord } from '../../types/attendance.types';
import { formatDate, formatTime } from '../../utils/date.utils';

type FilterType = 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export const AttendanceHistoryScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    setError(false);
    try {
      const statusParam = filter === 'ALL' ? undefined : filter;
      const data = await studentApi.getAttendanceHistory({ status: statusParam });
      setRecords(data);
    } catch (err) {
      setError(true);
      console.warn('History fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { void fetchHistory(); }, [fetchHistory]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderFilterButton = (type: FilterType, label: string) => {
    const isSelected = filter === type;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isSelected && styles.activeFilterChip]}
        onPress={() => setFilter(type)}
      >
        <Text style={[styles.filterText, isSelected && styles.activeFilterText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRecordItem = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.moduleCode}>{item.moduleCode}</Text>
          <Text style={styles.moduleName}>{item.moduleName}</Text>
        </View>
        <AttendanceStatusBadge status={item.status} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>📅 {formatDate(item.sessionDate)}</Text>
        <Text style={styles.timeText}>
          🕒 {item.scannedAt ? formatTime(item.scannedAt) : 'Not recorded'}
        </Text>
      </View>
      <ReviewRequest record={item} onSaved={fetchHistory} />
    </Card>
  );

  if (error) return <DataError onRetry={fetchHistory} />;
  return (
    <View style={styles.container}>
      {/* Filter Row */}
      <View style={styles.filterRow}>
        {renderFilterButton('ALL', 'All')}
        {renderFilterButton('PRESENT', 'Present')}
        {renderFilterButton('LATE', 'Late')}
        {renderFilterButton('ABSENT', 'Absent')}
        {renderFilterButton('EXCUSED', 'Excused')}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records found for this filter.</Text>
            </View>
          }
        />
      )}
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
  filterRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterChip: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  recordCard: {
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  moduleCode: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
