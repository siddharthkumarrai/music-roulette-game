import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import RoomsListScreen from "../screens/RoomsListScreen";
import CreateRoomScreen from "../screens/CreateRoomScreen";
import JoinRoomScreen from "../screens/JoinRoomScreen";
import RoomScreen from "../screens/RoomScreen";
import RoomSettingsScreen from "../screens/RoomSettingsScreen";
import MusicPlayerScreen from "../screens/MusicPlayerScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import PlaylistsScreen from "../screens/PlaylistsScreen";
import RoomRulesScreen from "../screens/RoomRulesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import OnboardingScreen from "../screens/OnboardingScreen";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: "#12111A" },
  headerTintColor: "#fff",
  headerShadowVisible: false,
  contentStyle: { backgroundColor: "#12111A" },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Rooms" component={RoomsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ title: "New Room" }} />
      <Stack.Screen name="JoinRoom" component={JoinRoomScreen} options={{ title: "Join Room" }} />
      <Stack.Screen
        name="Room"
        component={RoomScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
      <Stack.Screen name="RoomSettings" component={RoomSettingsScreen} options={{ title: "Room Settings" }} />
      <Stack.Screen name="MusicPlayer" component={MusicPlayerScreen} options={{ title: "Listening Now" }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: "Leaderboard" }} />
      <Stack.Screen name="Playlists" component={PlaylistsScreen} options={{ title: "Playlists" }} />
      <Stack.Screen name="RoomRules" component={RoomRulesScreen} options={{ title: "Room Rules" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Stack.Navigator>
  );
}

function OnboardingStack({ onComplete }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} initialParams={{ onComplete }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("has_seen_onboarding").then((val) => {
      setHasSeenOnboarding(val === "true");
      setOnboardingChecked(true);
    });
  }, []);

  if (!onboardingChecked || authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#12111A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#B98CFF" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ colors: { background: "#12111A" } }}>
      {!hasSeenOnboarding ? (
        <OnboardingStack onComplete={() => setHasSeenOnboarding(true)} />
      ) : user ? (
        <MainStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
