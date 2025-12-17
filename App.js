import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';

import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import JoinScreen from './src/screens/JoinScreen';
import GameSharedScreen from './src/screens/GameSharedScreen';
import GameDistributedScreen from './src/screens/GameDistributedScreen';
import PartyStatsScreen from './src/screens/PartyStatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Empêcher le splash screen de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

function AppNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            cardStyle: { backgroundColor: colors.backgroundSolid }
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Config" component={ConfigScreen} />
          <Stack.Screen name="Join" component={JoinScreen} />
          <Stack.Screen name="GameShared" component={GameSharedScreen} />
          <Stack.Screen name="GameDistributed" component={GameDistributedScreen} />
          <Stack.Screen name="PartyStats" component={PartyStatsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Précharger les ressources nécessaires
        // (polices, images, AsyncStorage, etc.)
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn('Error during app preparation:', e);
      } finally {
        // Indiquer que l'app est prête
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    // Cacher le splash screen quand l'app est prête
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Ne rien afficher tant que l'app n'est pas prête
  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}