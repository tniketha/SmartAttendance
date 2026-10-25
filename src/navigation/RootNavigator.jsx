import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";
import { Colors } from "../constants/colors";
import { BrandLogo } from "../components/common/BrandLogo";

// Screens & Navigators
import { LoginScreen } from "../screens/auth/LoginScreen";
import { StudentNavigator } from "./StudentNavigator";
import { LecturerNavigator } from "./LecturerNavigator";
const Stack = createNativeStackNavigator();
export const RootNavigator = () => {
  const { isAuthenticated, isLoading, user, initialize } = useAuthStore();
  useEffect(() => {
    initialize();
  }, [initialize]);
  if (isLoading) {
    return (
      <View style={styles.center}>
        <View
          style={{
            marginBottom: 24,
          }}
        >
          <BrandLogo size={72} />
        </View>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: Colors.background,
          card: Colors.surface,
          text: Colors.textPrimary,
          primary: Colors.primary,
          border: Colors.border,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === "STUDENT" ? (
          <Stack.Screen name="StudentApp" component={StudentNavigator} />
        ) : user?.role === "LECTURER" ? (
          <Stack.Screen name="LecturerApp" component={LecturerNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
