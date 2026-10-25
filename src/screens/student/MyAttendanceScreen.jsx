import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { studentApi } from "../../api/student.api";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DataError } from "../../components/common/DataError";
import { SemesterFilter } from "../../components/common/SemesterFilter";
import { AttendanceStatusBadge } from "../../components/student/AttendanceStatusBadge";
import { Colors } from "../../constants/colors";
import { formatDate, formatTime } from "../../utils/date.utils";
import {
  ALL_SEMESTERS,
  filterSemester,
  semesterLabel,
} from "../../utils/semester.utils";
export function MyAttendanceScreen() {
  const [records, setRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [semester, setSemester] = useState(ALL_SEMESTERS);
  const [view, setView] = useState("summary");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const loadAttendance = useCallback(async () => {
    setError(false);
    try {
      const [history, statistics] = await Promise.all([
        studentApi.getAttendanceHistory(),
        studentApi.getStatistics(),
      ]);
      setRecords(history);
      setSubjects(statistics.subjectWise);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void loadAttendance();
    }, [loadAttendance]),
  );
  if (error) return <DataError onRetry={loadAttendance} />;
  if (loading)
    return (
      <ActivityIndicator
        style={styles.loading}
        size="large"
        color={Colors.primary}
      />
    );
  const selectedSubjects = filterSemester(subjects, semester);
  const selectedRecords = filterSemester(records, semester).filter(
    (record) => status === "ALL" || record.status === status,
  );
  let total = 0;
  let present = 0;
  let late = 0;
  let absent = 0;
  for (const subject of selectedSubjects) {
    total += subject.total;
    present += subject.present;
    late += subject.late;
    absent += subject.absent;
  }
  const percentage = total
    ? Math.round(((present + late) / total) * 100)
    : null;
  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={view === "history" ? selectedRecords : []}
      keyExtractor={(record) => record.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadAttendance();
          }}
        />
      }
      ListHeaderComponent={
        <>
          <SemesterFilter
            items={subjects}
            value={semester}
            onChange={setSemester}
          />
          <View style={styles.buttons}>
            <Button
              title="Summary"
              variant={view === "summary" ? "primary" : "outline"}
              onPress={() => setView("summary")}
            />
            <Button
              title="History"
              variant={view === "history" ? "primary" : "outline"}
              onPress={() => setView("history")}
            />
          </View>
          {view === "summary" ? (
            <>
              <Card style={styles.summary}>
                <Text style={styles.title}>Semester attendance</Text>
                <Text style={styles.percentage}>
                  {percentage === null ? "—" : `${percentage}%`}
                </Text>
                <Text style={styles.detail}>{total} completed classes</Text>
                <Text style={styles.detail}>
                  Present: {present} · Late: {late} · Absent: {absent}
                </Text>
              </Card>
              <Text style={styles.title}>By subject</Text>
              {selectedSubjects.map((subject) => (
                <Card key={subject.moduleCode} style={styles.record}>
                  <Text style={styles.code}>{subject.moduleCode}</Text>
                  <Text style={styles.name}>{subject.moduleName}</Text>
                  <Text style={styles.detail}>{semesterLabel(subject)}</Text>
                  <Text style={styles.detail}>
                    {subject.total
                      ? `${subject.percentage}% attendance · ${subject.total} classes`
                      : "No completed classes"}
                  </Text>
                </Card>
              ))}
            </>
          ) : (
            <View style={styles.buttons}>
              {["ALL", "PRESENT", "LATE", "ABSENT"].map((value) => (
                <Button
                  key={value}
                  title={
                    value === "ALL"
                      ? "All"
                      : value[0] + value.slice(1).toLowerCase()
                  }
                  variant={status === value ? "primary" : "outline"}
                  onPress={() => setStatus(value)}
                />
              ))}
            </View>
          )}
        </>
      }
      renderItem={({ item }) => (
        <Card style={styles.record}>
          <View style={styles.recordHeader}>
            <Text style={styles.code}>{item.moduleCode}</Text>
            <AttendanceStatusBadge status={item.status} />
          </View>
          <Text style={styles.name}>{item.moduleName}</Text>
          <Text style={styles.detail}>{semesterLabel(item)}</Text>
          <Text style={styles.detail}>
            {formatDate(item.sessionDate)} ·{" "}
            {item.scannedAt ? formatTime(item.scannedAt) : "Not checked in"}
          </Text>
        </Card>
      )}
      ListEmptyComponent={
        view === "history" ? (
          <Text style={styles.detail}>
            No attendance records for this selection.
          </Text>
        ) : null
      }
    />
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  summary: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  percentage: {
    fontSize: 40,
    fontWeight: "700",
    color: Colors.primary,
  },
  code: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  detail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  record: {
    marginVertical: 6,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
