import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useTheme, useThemeStore } from './src/store/themeStore';
import { Button } from './src/components/common/Button';

class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={{ flex: 1, padding: 32, justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
      <Text accessibilityRole="alert" style={{ fontSize: 20, color: '#0F172A' }}>Something went wrong.</Text>
      <Text style={{ marginVertical: 16 }}>Please try again. Your saved attendance is not affected.</Text>
      <Button title="Try again" onPress={() => this.setState({ failed: false })} />
    </View>;
    return this.props.children;
  }
}

export default function App() {
  const { Colors, dark } = useTheme();
  useEffect(() => { void useThemeStore.getState().initialize(); }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 1280, alignSelf: 'center' }}>
          <ErrorBoundary><RootNavigator /></ErrorBoundary>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
