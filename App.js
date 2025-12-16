import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import JoinScreen from './src/screens/JoinScreen';
import GameSharedScreen from './src/screens/GameSharedScreen';
import GameDistributedScreen from './src/screens/GameDistributedScreen';
import PartyStatsScreen from './src/screens/PartyStatsScreen';

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
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}