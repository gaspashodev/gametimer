import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import JoinScreen from './src/screens/JoinScreen';
import GameSharedScreen from './src/screens/GameSharedScreen';
import GameDistributedScreen from './src/screens/GameDistributedScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4F46E5',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ title: 'Timer Multi-Joueurs' }}
          />
          <Stack.Screen 
            name="Config" 
            component={ConfigScreen}
            options={{ title: 'Configuration' }}
          />
          <Stack.Screen 
            name="Join" 
            component={JoinScreen}
            options={{ title: 'Rejoindre une Partie' }}
          />
          <Stack.Screen 
            name="GameShared" 
            component={GameSharedScreen}
            options={{ title: 'Partie en Cours', headerLeft: null }}
          />
          <Stack.Screen 
            name="GameDistributed" 
            component={GameDistributedScreen}
            options={{ title: 'Ma Partie', headerLeft: null }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
