import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useTheme, ThemeColors } from '../store/themeStore';

// Screens & Navigators
import { LoginScreen } from '../screens/auth/LoginScreen';
import { StudentNavigator } from './StudentNavigator';
import { LecturerNavigator } from './LecturerNavigator';
import { AdminNavigator } from './AdminNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const { Colors, dark } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const { isAuthenticated, isLoading, user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ ...(dark ? DarkTheme : DefaultTheme), colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: Colors.background, card: Colors.surface, text: Colors.textPrimary, primary: Colors.primary, border: Colors.border } }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'STUDENT' ? (
          <Stack.Screen name="StudentApp" component={StudentNavigator} />
        ) : user?.role === 'LECTURER' ? (
          <Stack.Screen name="LecturerApp" component={LecturerNavigator} />
        ) : user?.role === 'ADMIN' ? (
          <Stack.Screen name="AdminApp" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
