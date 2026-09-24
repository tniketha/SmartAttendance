import { exportAttendance } from '../../utils/export.utils';
import { ReviewInbox } from '../../components/lecturer/ReviewInbox';
import { Alert } from '../../utils/alert.utils';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { lecturerApi } from '../../api/lecturer.api';
import { reportsApi } from '../../api/reports.api';

export const LecturerReportsScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [exporting, setExporting] = useState(false);
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingReport, setFetchingReport] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await lecturerApi.getModules();
        setModules(res);
        if (res.length > 0) {
          setSelectedModuleId(res[0].id);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load modules');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedModuleId) return;

    let current = true;
    (async () => {
      setFetchingReport(true);
      setReportData(null);
      try {
        const rep = await reportsApi.getModuleReport(selectedModuleId);
        if (current) setReportData(rep);
      } catch (err) {
        Alert.alert('Error', 'Failed to load report');
      } finally {
        if (current) setFetchingReport(false);
      }
    })();
    return () => { current = false; };
  }, [selectedModuleId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Reports</Text>
        <Text style={styles.subtitle}>View module analytics and student breakdown</Text>
      </View>

      <Button title="Export CSV" variant="outline" loading={exporting} disabled={!selectedModuleId} onPress={async () => {
        setExporting(true);
        try { await exportAttendance(selectedModuleId, modules.find(m => m.id === selectedModuleId)?.moduleCode || 'report'); }
        catch (e: any) { Alert.alert('Export failed', e.response?.data?.error || e.message || 'Please try again.'); }
        finally { setExporting(false); }
      }} />
      {/* Module Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
        {modules.map((m) => {
          const isSelected = m.id === selectedModuleId;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.moduleChip, isSelected && styles.activeModuleChip]}
              onPress={() => setSelectedModuleId(m.id)}
            >
              <Text style={[styles.moduleChipText, isSelected && styles.activeModuleChipText]}>
                {m.moduleCode}
              </Text>
            </TouchableOpacity>
          );
        })}
    </ScrollView>

      {fetchingReport ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : reportData ? (
        <View>
          {/* Module Summary Card */}
          <Card style={styles.summaryCard}>
            <Text style={styles.moduleNameTitle}>{reportData.module.moduleName}</Text>
            <Text style={styles.moduleMeta}>
              {reportData.module.moduleCode} • {reportData.module.department}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{reportData.module.totalSessions}</Text>
                <Text style={styles.statLbl}>Total Sessions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{reportData.module.totalEnrolled}</Text>
                <Text style={styles.statLbl}>Enrolled Students</Text>
              </View>
            </View>
          </Card>

          {/* Student Roster Breakdown */}
          <View style={styles.rosterSection}>
            <Text style={styles.sectionHeader}>Student Breakdown</Text>
            {reportData.studentStats.map((s: any) => (
              <Card key={s.studentId} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View>
                    <Text style={styles.studentNumber}>{s.studentNumber}</Text>
                    <Text style={styles.studentName}>{s.studentName}</Text>
                  </View>
                  <View style={styles.rateBadge}>
                    <Text
                      style={[
                        styles.rateText,
                        {
                          color:
                            s.percentage >= 80
                              ? Colors.present
                              : s.percentage >= 65
                              ? Colors.late
                              : Colors.absent,
                        },
                      ]}
                    >
                      {s.totalSessions ? `${s.percentage}%` : '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.studentMetrics}>
                  <Text style={styles.metricText}>
                    Present: <Text style={styles.bold}>{s.present}</Text>
                  </Text>
                  <Text style={styles.metricText}>
                    Late: <Text style={styles.bold}>{s.late}</Text>
                  </Text>
                  <Text style={styles.metricText}>
                    Absent: <Text style={styles.bold}>{s.absent}</Text>
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
      ) : null}
      <ReviewInbox />
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
    paddingVertical: 40,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  selectorScroll: {
    marginVertical: 10,
  },
  moduleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  activeModuleChip: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  moduleChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  activeModuleChipText: {
    color: '#FFFFFF',
  },
  summaryCard: {
    marginVertical: 10,
    padding: 16,
  },
  moduleNameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  moduleMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLbl: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rosterSection: {
    marginTop: 10,
    marginBottom: 40,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  studentCard: {
    marginVertical: 4,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  rateBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateText: {
    fontSize: 16,
    fontWeight: '800',
  },
  studentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metricText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
