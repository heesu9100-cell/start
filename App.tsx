import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import RemoteControlScreen from './src/screens/RemoteControlScreen';
import DisplayScreen from './src/screens/DisplayScreen';
import ControllerScreen from './src/screens/ControllerScreen';
import { ExamType } from './src/types';

export type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[] };
  RemoteControl: undefined;
  Display: { roomCode: string };
  Controller: { roomCode: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F5F7FA' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="RemoteControl" component={RemoteControlScreen} />
        <Stack.Screen name="Display" component={DisplayScreen} />
        <Stack.Screen name="Controller" component={ControllerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
