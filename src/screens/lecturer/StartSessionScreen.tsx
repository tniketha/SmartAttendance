import { Alert } from '../../utils/alert.utils';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { lecturerApi } from '../../api/lecturer.api';

export const StartSessionScreen: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const navigation = useNavigation<any>();

  const [modules, setModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [duration, setDuration] = useState<number>(10); // minutes
  const [lateThreshold, setLateThreshold] = useState<number>(5); // minutes
  const [geoEnabled, setGeoEnabled] = useState<boolean>(true);
  const [classroomLocation, setClassroomLocation] = useState<{
    latitude?: number;
    longitude?: number;
  }>({});
  const [loading, setLoading] = useState(false);
  const [fetchingModules, setFetchingModules] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await lecturerApi.getModules();
        setModules(res);
        if (res.length > 0) {
          setSelectedModuleId(res[0].id);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load assigned modules');
      } finally {
        setFetchingModules(false);
      }
    })();
  }, []);

  const handleToggleGeo = async (val: boolean) => {
    setGeoEnabled(val);
    if (val && classroomLocation.latitude === undefined) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for classroom geofencing');
        setGeoEnabled(false);
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setClassroomLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (e) {
        Alert.alert('Location Error', 'Unable to determine current classroom location');
        setGeoEnabled(false);
      }
    }
  };

  const handleStartSession = async () => {
    if (!selectedModuleId) {
      Alert.alert('Selection Error', 'Please select a module first');
      return;
    }

    setLoading(true);
    try {
      let coordinates = classroomLocation;
      if (geoEnabled) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') throw new Error('Allow precise location before starting a location-verified class.');
        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (fix.mocked || fix.coords.accuracy === null || fix.coords.accuracy > 100) throw new Error('Classroom location is too imprecise. Try again near a window.');
        coordinates = { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
        setClassroomLocation(coordinates);
      }
      const res = await lecturerApi.createSession({
        moduleId: selectedModuleId,
        durationMinutes: duration,
        lateThresholdMinutes: Math.min(lateThreshold, duration),
        geoValidationEnabled: geoEnabled,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        allowedRadius: 100,
      });

      navigation.navigate('ActiveQR', {
        sessionId: res.session.id,
        moduleCode: res.session.moduleCode,
        moduleName: res.session.moduleName,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to start attendance session';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingModules) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Start Attendance Session</Text>
        <Text style={styles.subtitle}>Configure session parameters and generate dynamic QR</Text>
      </View>

      {/* Select Module */}
      <Card style={styles.card}>
        <Text style={styles.sectionHeader}>1. Select Module</Text>
        {modules.map((m) => {
          const isSelected = m.id === selectedModuleId;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.moduleOption, isSelected && styles.selectedModuleOption]}
              onPress={() => setSelectedModuleId(m.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.moduleCode, isSelected && styles.selectedText]}>
                  {m.moduleCode}
                </Text>
                <Text style={[styles.moduleName, isSelected && styles.selectedSub]}>
                  {m.moduleName}
                </Text>
              </View>
              <Text style={[styles.enrolledCount, isSelected && styles.selectedText]}>
                {m.enrolledCount} Students
              </Text>
            </TouchableOpacity>
          );
        })}
      </Card>

      {/* Duration Options */}
      <Card style={styles.card}>
        <Text style={styles.sectionHeader}>2. Attendance Duration</Text>
        <Text style={styles.helpText}>Session will auto-expire after this duration.</Text>
        <View style={styles.pillRow}>
          {[5, 10, 15, 30].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.pill, duration === mins && styles.selectedPill]}
              onPress={() => setDuration(mins)}
            >
              <Text style={[styles.pillText, duration === mins && styles.selectedPillText]}>
                {mins} mins
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Late Threshold */}
      <Card style={styles.card}>
        <Text style={styles.sectionHeader}>3. Late Attendance Threshold</Text>
        <Text style={styles.helpText}>
          Scans after this time will be marked as 'LATE' rather than 'PRESENT'.
        </Text>
        <View style={styles.pillRow}>
          {[3, 5, 10, 15].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.pill, lateThreshold === mins && styles.selectedPill]}
              onPress={() => setLateThreshold(mins)}
            >
              <Text
                style={[styles.pillText, lateThreshold === mins && styles.selectedPillText]}
              >
                After {mins} mins
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Location Validation */}
      <Card style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.sectionHeader}>4. GPS Geofencing</Text>
            <Text style={styles.helpText}>
              Require students to be within 100 metres of the classroom.
            </Text>
          </View>
          <Switch
            value={geoEnabled}
            onValueChange={handleToggleGeo}
            trackColor={{ false: '#CBD5E1', true: Colors.primaryLight }}
            thumbColor={geoEnabled ? Colors.primary : '#FFFFFF'}
          />
        </View>

        {geoEnabled && classroomLocation.latitude ? (
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>
              ✓ Classroom coordinates locked: {classroomLocation.latitude.toFixed(4)},{' '}
              {classroomLocation.longitude?.toFixed(4)} (Radius: 100m)
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Launch Button */}
      <View style={styles.btnContainer}>
        <Button
          title="⚡ Generate Attendance QR"
          onPress={handleStartSession}
          loading={loading}
          style={styles.generateBtn}
        />
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
  header: {
    marginBottom: 16,
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
  card: {
    marginVertical: 8,
    padding: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  moduleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 4,
  },
  selectedModuleOption: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  moduleCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  moduleName: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  enrolledCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  selectedSub: {
    color: '#E2E8F0',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  selectedPill: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  selectedPillText: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationBadge: {
    backgroundColor: Colors.presentBg,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  locationText: {
    fontSize: 12,
    color: Colors.present,
    fontWeight: '600',
  },
  btnContainer: {
    marginVertical: 20,
    marginBottom: 40,
  },
  generateBtn: {
    height: 52,
    borderRadius: 12,
  },
});
