import { AppIcon } from '../components/common/AppIcon';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useTheme, ThemeColors } from '../store/themeStore';
import { LecturerHomeScreen } from '../screens/lecturer/LecturerHomeScreen';
import { StartSessionScreen } from '../screens/lecturer/StartSessionScreen';
import { ActiveQRDisplayScreen } from '../screens/lecturer/ActiveQRDisplayScreen';
import { LecturerReportsScreen } from '../screens/lecturer/LecturerReportsScreen';
import { LecturerProfileScreen } from '../screens/lecturer/LecturerProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const LecturerTabs: React.FC = () => {
  const { Colors } = useTheme();
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
        name="LecturerHome"
        component={LecturerHomeScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'Lecturer Portal',
          tabBarIcon: ({ color }) => <AppIcon name="chart" color={color} />,
        }}
      />
      <Tab.Screen
        name="StartSession"
        component={StartSessionScreen}
        options={{
          title: 'Start Class',
          headerTitle: 'Create Session',
          tabBarIcon: ({ color }) => <AppIcon name="add" color={color} />,
        }}
      />
      <Tab.Screen
        name="LecturerReports"
        component={LecturerReportsScreen}
        options={{
          title: 'Reports',
          headerTitle: 'Attendance Reports',
          tabBarIcon: ({ color }) => <AppIcon name="report" color={color} />,
        }}
      />
      <Tab.Screen
        name="LecturerProfile"
        component={LecturerProfileScreen}
        options={{
          title: 'Profile',
          headerTitle: 'Faculty Profile',
          tabBarIcon: ({ color }) => <AppIcon name="user" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const LecturerNavigator: React.FC = () => {
  const { Colors } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LecturerTabs"
        component={LecturerTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ActiveQR"
        component={ActiveQRDisplayScreen}
        options={{
          title: 'Live Attendance Session',
          headerBackTitle: 'Dashboard',
          headerStyle: { backgroundColor: Colors.surface },
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
    </Stack.Navigator>
  );
};
