import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkspaceScreen from './src/screens/WorkspaceScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import Preview3DScreen from './src/screens/Preview3DScreen';
import SaveDishScreen from './src/screens/SaveDishScreen';
import ClientMenuScreen from './src/screens/ClientMenuScreen';
import { Storage } from './src/services/storage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await Storage.seed();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <View style={styles.splash}><StatusBar style="dark" /></View>;
  }

  if (!authenticated) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.accentLine} />
        <AuthScreen onAuth={() => setAuthenticated(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.accentLine} />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#F8F9FC' },
          }}
        >
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Workspace" component={WorkspaceScreen} />
          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen
            name="Preview3D"
            component={Preview3DScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="SaveDish" component={SaveDishScreen} />
          <Stack.Screen
            name="ClientPreview"
            component={ClientMenuScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#0047FF',
    zIndex: 9999,
  },
});
