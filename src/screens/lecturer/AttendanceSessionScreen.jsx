import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { lecturerApi } from "../../api/lecturer.api";
import { Colors } from "../../constants/colors";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { DataError } from "../../components/common/DataError";
import { QRCodeCanvas } from "../../components/lecturer/QRCodeCanvas";
import { AttendanceStatusBadge } from "../../components/student/AttendanceStatusBadge";
import { Alert } from "../../utils/alert.utils";
import { formatTime } from "../../utils/date.utils";
import { semesterLabel } from "../../utils/semester.utils";
export function AttendanceSessionScreen() {
  const { sessionId } = useRoute().params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await lecturerApi.getSession(sessionId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);
  useFocusEffect(
    useCallback(() => {
      void loadAttendance();
    }, [loadAttendance]),
  );
  async function endClass() {
    setLoading(true);
    try {
      await lecturerApi.closeSession(sessionId);
      await loadAttendance();
    } catch (error) {
      Alert.alert(
        "Unable to end class",
        error.response?.data?.error || "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  function confirmEndClass() {
    Alert.alert(
      "End class?",
      "Students who have not checked in will be marked absent.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "End class",
          style: "destructive",
          onPress: endClass,
        },
      ],
    );
  }
  if (error) return <DataError onRetry={loadAttendance} />;
  if (!data)
    return (
      <View style={styles.page}>
        <Text style={styles.subtitle}>Loading attendance…</Text>
      </View>
    );
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text style={styles.code}>{data.session.moduleCode}</Text>
      <Text style={styles.title}>{data.session.moduleName}</Text>
      <Text style={styles.subtitle}>{semesterLabel(data.session)}</Text>
      <Text style={styles.subtitle}>
        {data.session.status} · Ends at {formatTime(data.session.endTime)}
      </Text>
      {data.qrString ? (
        <Card style={styles.qrCard}>
          <Text style={styles.heading}>Scan to mark attendance</Text>
          <QRCodeCanvas value={data.qrString} size={220} />
          <Text style={styles.subtitle}>Available until this class ends.</Text>
        </Card>
      ) : (
        <Card>
          <Text style={styles.heading}>This class has ended.</Text>
        </Card>
      )}
      <Button
        title="Refresh attendance"
        variant="outline"
        loading={loading}
        onPress={loadAttendance}
      />
      <Text style={styles.heading}>
        {data.counts.checkedIn} / {data.counts.totalEnrolled} checked in
      </Text>
      <Text style={styles.subtitle}>
        Present: {data.counts.present} · Late: {data.counts.late} · Absent:{" "}
        {data.counts.absent}
      </Text>
      {data.students.map((student) => (
        <Card key={student.studentId} style={styles.student}>
          <View
            style={{
              flex: 1,
            }}
          >
            <Text style={styles.code}>{student.studentNumber}</Text>
            <Text style={styles.heading}>{student.name}</Text>
            {student.scannedAt && (
              <Text style={styles.subtitle}>
                {formatTime(student.scannedAt)}
              </Text>
            )}
          </View>
          {student.status ? (
            <AttendanceStatusBadge status={student.status} />
          ) : (
            <Text style={styles.subtitle}>Not checked in</Text>
          )}
        </Card>
      ))}
      {data.session.status === "ACTIVE" && (
        <Button
          title="End class"
          variant="danger"
          loading={loading}
          onPress={confirmEndClass}
        />
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  code: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginVertical: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginVertical: 4,
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 10,
  },
  qrCard: {
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  student: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
});
