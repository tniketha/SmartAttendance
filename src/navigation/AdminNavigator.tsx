import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, ThemeColors } from '../store/themeStore';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';

const Stack = createNativeStackNavigator();

export const AdminNavigator: React.FC = () => {
  const { Colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontWeight: '700', color: Colors.textPrimary },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Admin Console' }}
      />
    </Stack.Navigator>
  );
};
