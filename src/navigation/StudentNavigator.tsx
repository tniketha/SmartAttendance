import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AttendanceAnalyticsScreen } from '../screens/student/AttendanceAnalyticsScreen';
import { AppIcon } from '../components/common/AppIcon';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme, ThemeColors } from '../store/themeStore';
import { StudentHomeScreen } from '../screens/student/StudentHomeScreen';
import { StudentModulesScreen } from '../screens/student/StudentModulesScreen';
import { QRScannerScreen } from '../screens/student/QRScannerScreen';
import { AttendanceHistoryScreen } from '../screens/student/AttendanceHistoryScreen';
import { StudentProfileScreen } from '../screens/student/StudentProfileScreen';

const Tab = createBottomTabNavigator();

const StudentTabs: React.FC = () => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontWeight: '700', color: Colors.textPrimary },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          minHeight: 76,
          paddingBottom: 12,
          paddingTop: 6,
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tab.Screen
        name="StudentHome"
        component={StudentHomeScreen}
        options={{
          title: 'Home',
          headerTitle: 'Smart Attendance',
          tabBarIcon: ({ color }) => <AppIcon name="home" color={color} />,
        }}
      />
      <Tab.Screen
        name="StudentModules"
        component={StudentModulesScreen}
        options={{
          title: 'Modules',
          headerTitle: 'Enrolled Modules',
          tabBarIcon: ({ color }) => <AppIcon name="modules" color={color} />,
        }}
      />
      <Tab.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: 'Scan',
          headerTitle: 'Scan Attendance QR',
          tabBarIcon: () => (
            <View style={styles.scanTabButton}>
              <AppIcon name="scan" color="#FFFFFF" size={24} />
            </View>
          ),
          tabBarAccessibilityLabel: 'Scan classroom QR code',
        }}
      />
      <Tab.Screen
        name="AttendanceHistory"
        component={AttendanceHistoryScreen}
        options={{
          title: 'History',
          headerTitle: 'Attendance History',
          tabBarIcon: ({ color }) => <AppIcon name="history" color={color} />,
        }}
      />
      <Tab.Screen
        name="StudentProfile"
        component={StudentProfileScreen}
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          tabBarIcon: ({ color }) => <AppIcon name="user" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  scanTabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

const Stack = createNativeStackNavigator();
export const StudentNavigator: React.FC = () => {
  const { Colors } = useTheme();
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: Colors.surface }, headerTintColor: Colors.textPrimary }}>
    <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
    <Stack.Screen name="AttendanceAnalytics" component={AttendanceAnalyticsScreen} options={{ title: 'Attendance insights' }} />
  </Stack.Navigator>;
};
