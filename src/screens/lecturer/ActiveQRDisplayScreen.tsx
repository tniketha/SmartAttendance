import { Alert } from '../../utils/alert.utils';
import { useAuthStore } from '../../store/authStore';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import io, { Socket } from 'socket.io-client';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { QRCodeCanvas } from '../../components/lecturer/QRCodeCanvas';
import { AttendanceStatusBadge } from '../../components/student/AttendanceStatusBadge';
import { lecturerApi, CloseSessionResponse } from '../../api/lecturer.api';
import { SOCKET_URL, APP_CONFIG } from '../../constants/config';
import { LiveSessionData, LiveCheckedInStudent } from '../../types/attendance.types';
import { formatTime } from '../../utils/date.utils';

export const ActiveQRDisplayScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sessionId, moduleCode, moduleName } = route.params;

  const [qrString, setQrString] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(APP_CONFIG.QR_REFRESH_SECONDS);
  const [sessionData, setSessionData] = useState<LiveSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [summary, setSummary] = useState<CloseSessionResponse | null>(null);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkedIn' | 'missing'>('checkedIn');

  const [error, setError] = useState('');
  const refreshBusy = useRef(false);
  const closed = useRef(false);
  const expires = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerRefreshQR = useCallback(async () => {
    if (refreshBusy.current || closed.current) return;
    refreshBusy.current = true;
    try {
      const res = await lecturerApi.refreshQR(sessionId);
      if (closed.current) return;
      expires.current = Date.now() + Math.max(0, Date.parse(res.expiresAt) - res.qrPayload.timestamp - 1000);
      setQrString(res.qrString); setError('');
    } catch (err: any) {
      setQrString(''); setError(err.response?.data?.error || 'QR refresh failed. Check your connection.');
      expires.current = Date.now() + 5000;
    } finally { refreshBusy.current = false; }
  }, [sessionId]);
  const fetchSessionDetails = useCallback(async () => {
    try {
      const live = await lecturerApi.getSessionLive(sessionId);
      setSessionData(live);
      closed.current = live.session.status !== 'ACTIVE' || Date.parse(live.session.endTime) <= Date.now();
      if (closed.current) setQrString('');
      else await triggerRefreshQR();
    } catch { setError('Unable to load attendance. Check your connection and retry.'); }
    finally { setLoading(false); }
  }, [sessionId, triggerRefreshQR]);

  // 3. Setup WebSocket connection & room joining
  useEffect(() => {
    fetchSessionDetails();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected, joining session room:', sessionId);
      socket.emit('join_session', sessionId);
    });

    // Real-time student scan listener
    socket.on('session_closed', () => { closed.current = true; setQrString(''); if (timerRef.current) clearInterval(timerRef.current); lecturerApi.getSessionLive(sessionId).then(setSessionData).catch(() => {}); });
    socket.on('student_scanned', (newStudent: LiveCheckedInStudent) => {


      setSessionData((prev) => {
        if (!prev) return prev;

        // Check if student already in checked-in list
        const alreadyExists = prev.checkedInStudents.some(
          (s) => s.studentId === newStudent.studentId
        );
        if (alreadyExists) return prev;

        const updatedCheckedIn = [newStudent, ...prev.checkedInStudents];
        const updatedMissing = prev.missingStudents.filter(
          (s) => s.studentId !== newStudent.studentId
        );

        return {
          ...prev,
          counts: {
            ...prev.counts,
            checkedIn: updatedCheckedIn.length,
            present:
              newStudent.status === 'PRESENT'
                ? prev.counts.present + 1
                : prev.counts.present,
            late:
              newStudent.status === 'LATE'
                ? prev.counts.late + 1
                : prev.counts.late,
            missing: updatedMissing.length,
          },
          checkedInStudents: updatedCheckedIn,
          missingStudents: updatedMissing,
        };
      });
    });

    return () => {
      if (socket) {
        socket.emit('leave_session', sessionId);
        socket.disconnect();
      }
    };
  }, [sessionId, fetchSessionDetails]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (closed.current) return;
      const remaining = Math.max(0, Math.ceil((expires.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (!remaining) { setQrString(''); void triggerRefreshQR(); }
    }, 1000);
    const poll = setInterval(() => {
      lecturerApi.getSessionLive(sessionId).then(live => {
        setSessionData(live);
        if (live.session.status !== 'ACTIVE' || Date.parse(live.session.endTime) <= Date.now()) { closed.current = true; setQrString(''); }
        if (!socketRef.current?.connected && !closed.current) socketRef.current?.connect();
      }).catch(() => {});
    }, 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); clearInterval(poll); };
  }, [sessionId, triggerRefreshQR]);

  // 5. Close Attendance Session Handler
  const handleCloseSession = () => {
    Alert.alert(
      'End Attendance Session?',
      'Closing this session will automatically mark all unscanned students as ABSENT. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Session',
          style: 'destructive',
          onPress: async () => {
            try {
              setClosing(true);
              const res = await lecturerApi.closeSession(sessionId);
              closed.current = true; setQrString('');
              setSummary(res);
              setSummaryModalVisible(true);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to close session');
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  const handleFinish = () => {
    setSummaryModalVisible(false);
    navigation.navigate('LecturerTabs', { screen: 'LecturerHome' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const counts = sessionData?.counts || {
    totalEnrolled: 0,
    checkedIn: 0,
    present: 0,
    late: 0,
    absent: 0,
    missing: 0,
  };

  return (
    <ScrollView style={styles.container}>
      {/* Session Title Header */}
      <View style={styles.header}>
        <Text style={styles.moduleCode}>{moduleCode}</Text>
        <Text style={styles.moduleName}>{moduleName}</Text>
        <View style={styles.badgeRow}>
          <Badge label={closed.current ? 'Attendance ended' : 'Attendance active'} variant={closed.current ? 'closed' : 'active'} />
          <Text style={styles.sessionTime}>
            End Time: {sessionData ? formatTime(sessionData.session.endTime) : ''}
          </Text>
        </View>
      </View>

      {/* Dynamic QR Display */}
      {!!error && <Text accessibilityRole="alert" style={{ color: Colors.absent, marginVertical: 12 }}>{error}</Text>}
      <Card style={styles.qrCard}>
        <Text style={styles.scanInstruction}>Scan to Mark Attendance</Text>
        {!closed.current && <QRCodeCanvas
          value={qrString}
          size={220}
          countdownSeconds={countdown}
        />}
        {closed.current && <Text style={{ color: Colors.textPrimary }}>This attendance session has ended.</Text>}

        <View style={styles.qrControls}>
          <Button
            title="🔄 Manual Refresh"
            variant="outline"
            disabled={closed.current}
            onPress={triggerRefreshQR}
            style={styles.refreshBtn}
          />
          <Button
            title="🛑 End Attendance"
            variant="danger"
            onPress={handleCloseSession}
            disabled={closed.current}
            loading={closing}
            style={styles.endBtn}
          />
        </View>
      </Card>

      {/* Live Metrics Pill Row */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricNumber}>
            {counts.checkedIn} / {counts.totalEnrolled}
          </Text>
          <Text style={styles.metricLabel}>Checked In</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: Colors.present }]}>
            {counts.present}
          </Text>
          <Text style={styles.metricLabel}>Present</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: Colors.late }]}>
            {counts.late}
          </Text>
          <Text style={styles.metricLabel}>Late</Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: Colors.absent }]}>
            {counts.missing}
          </Text>
          <Text style={styles.metricLabel}>Missing</Text>
        </Card>
      </View>

      {/* Live Roster Tabs */}
      <View style={styles.rosterSection}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'checkedIn' && styles.activeTab]}
            onPress={() => setActiveTab('checkedIn')}
          >
            <Text
              style={[styles.tabText, activeTab === 'checkedIn' && styles.activeTabText]}
            >
              Checked In ({counts.checkedIn})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'missing' && styles.activeTab]}
            onPress={() => setActiveTab('missing')}
          >
            <Text
              style={[styles.tabText, activeTab === 'missing' && styles.activeTabText]}
            >
              Unscanned ({counts.missing})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'checkedIn' ? (
          sessionData?.checkedInStudents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Waiting for students to scan QR...</Text>
            </Card>
          ) : (
            sessionData?.checkedInStudents.map((s) => (
              <Card key={s.id} style={styles.studentItem}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentNumber}>{s.studentNumber}</Text>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.scanTimestamp}>
                    🕒 {s.scannedAt ? formatTime(s.scannedAt) : 'Just now'}
                  </Text>
                </View>
                <AttendanceStatusBadge status={s.status} />
              </Card>
            ))
          )
        ) : sessionData?.missingStudents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>All enrolled students have checked in! 🎉</Text>
          </Card>
        ) : (
          sessionData?.missingStudents.map((s) => (
            <Card key={s.studentId} style={styles.studentItem}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentNumber}>{s.studentNumber}</Text>
                <Text style={styles.studentName}>{s.name}</Text>
              </View>
              <Badge label="Unscanned" variant="default" />
            </Card>
          ))
        )}
      </View>

      {/* Post-Session Summary Modal */}
      <Modal visible={summaryModalVisible} transparent animationType="slide" onRequestClose={handleFinish}>
        <View style={styles.modalBackdrop}>
          <View style={styles.summaryModal}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Attendance Completed</Text>
              <Text style={styles.summarySubtitle}>
                {summary?.moduleCode} – {summary?.moduleName}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatNum}>{summary?.totalStudents}</Text>
                <Text style={styles.summaryStatLbl}>Total Enrolled</Text>
              </View>

              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatNum, { color: Colors.present }]}>
                  {summary?.present}
                </Text>
                <Text style={styles.summaryStatLbl}>Present</Text>
              </View>

              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatNum, { color: Colors.late }]}>
                  {summary?.late}
                </Text>
                <Text style={styles.summaryStatLbl}>Late</Text>
              </View>

              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatNum, { color: Colors.absent }]}>
                  {summary?.absent}
                </Text>
                <Text style={styles.summaryStatLbl}>Absent (Auto)</Text>
              </View>
            </View>

            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Final Attendance Rate:</Text>
              <Text style={styles.rateValue}>{summary?.attendanceRate}%</Text>
            </View>

            <Button title="Done & Return to Dashboard" onPress={handleFinish} />
          </View>
        </View>
      </Modal>
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
    marginBottom: 12,
  },
  moduleCode: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  moduleName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sessionTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  qrCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scanInstruction: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  qrControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  refreshBtn: {
    flex: 1,
    height: 44,
  },
  endBtn: {
    flex: 1,
    height: 44,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 6,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rosterSection: {
    marginTop: 6,
    marginBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.primaryDark,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    paddingVertical: 10,
  },
  studentInfo: {
    flex: 1,
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
  scanTimestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  summaryModal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summarySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summaryStatLbl: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 20,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  rateValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.present,
  },
});
