import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { lecturerApi } from "../../api/lecturer.api";
import { Colors } from "../../constants/colors";
import { SemesterFilter } from "../../components/common/SemesterFilter";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DataError } from "../../components/common/DataError";
import {
  ALL_SEMESTERS,
  filterSemester,
  semesterLabel,
} from "../../utils/semester.utils";
import { Alert } from "../../utils/alert.utils";
export function StartSessionScreen() {
  const navigation = useNavigation();
  const [modules, setModules] = useState([]);
  const [semester, setSemester] = useState(ALL_SEMESTERS);
  const [selectedId, setSelectedId] = useState("");
  const [duration, setDuration] = useState(10);
  const [lateThreshold, setLateThreshold] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const visibleModules = filterSemester(modules, semester);
  async function loadModules() {
    setError(false);
    try {
      setModules(await lecturerApi.getModules());
    } catch {
      setError(true);
    }
  }
  useEffect(() => {
    void loadModules();
  }, []);
  useEffect(() => {
    if (!visibleModules.some((module) => module.id === selectedId))
      setSelectedId(visibleModules[0]?.id || "");
  }, [modules, semester, selectedId]);
  async function startClass() {
    setLoading(true);
    try {
      const result = await lecturerApi.createSession({
        moduleId: selectedId,
        durationMinutes: duration,
        lateThresholdMinutes: Math.min(lateThreshold, duration),
      });
      navigation.navigate("AttendanceSession", {
        sessionId: result.session.id,
      });
    } catch (error) {
      Alert.alert(
        "Unable to start class",
        error.response?.data?.error || "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  if (error) return <DataError onRetry={loadModules} />;
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text style={styles.title}>Start attendance session</Text>
      <SemesterFilter items={modules} value={semester} onChange={setSemester} />
      {visibleModules.map((module) => (
        <TouchableOpacity
          key={module.id}
          onPress={() => setSelectedId(module.id)}
          accessibilityRole="radio"
          aria-checked={selectedId === module.id}
          accessibilityLabel={`${module.moduleCode} ${module.moduleName}`}
        >
          <Card
            style={{
              borderColor:
                selectedId === module.id ? Colors.primary : Colors.border,
              borderWidth: 2,
            }}
          >
            <Text style={styles.code}>{module.moduleCode}</Text>
            <Text style={styles.heading}>{module.moduleName}</Text>
            <Text style={styles.subtitle}>{semesterLabel(module)}</Text>
          </Card>
        </TouchableOpacity>
      ))}
      <Card>
        <Text style={styles.heading}>Class duration</Text>
        <View style={styles.options}>
          {[5, 10, 15, 30].map((minutes) => (
            <Button
              key={minutes}
              title={`${minutes} min`}
              variant={duration === minutes ? "primary" : "outline"}
              onPress={() => setDuration(minutes)}
            />
          ))}
        </View>
        <Text style={styles.heading}>Mark as late after</Text>
        <View style={styles.options}>
          {[0, 3, 5, 10]
            .filter((minutes) => minutes <= duration)
            .map((minutes) => (
              <Button
                key={minutes}
                title={`${minutes} min`}
                variant={
                  Math.min(lateThreshold, duration) === minutes
                    ? "primary"
                    : "outline"
                }
                onPress={() => setLateThreshold(minutes)}
              />
            ))}
        </View>
      </Card>
      <Button
        title="Start class"
        disabled={!selectedId}
        loading={loading}
        onPress={startClass}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginVertical: 8,
  },
  code: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
});
