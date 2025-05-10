import React, { useState, useEffect, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { Provider as PaperProvider } from "react-native-paper";
import AcadEaseTheme from "./src/utils/theme";
import * as SplashScreen from "expo-splash-screen";

// Import actual screens
import LoginScreen from "./src/screens/Authentication_Screen/Login_Screen";
import RegisterScreen from "./src/screens/Authentication_Screen/Register_Screen";
import HomeScreen from "./src/screens/User_Screen/Home_Screen";
import TasksScreen from "./src/screens/User_Screen/Tasks_Screen";
import AskAiScreen from "./src/screens/User_Screen/AskAI_Screen";
import CalendarScreen from "./src/screens/User_Screen/Calendar_Screen";

// Import auth service
import { authService, pocketbaseClient } from "./src/utils/pocketbaseService";
import { initializePocketBase } from "./src/utils/pocketbaseService";
import ErrorBoundary from "./src/components/ErrorBoundary"; // Import ErrorBoundary

const Stack = createStackNavigator();

const AppStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="AskAI" component={AskAiScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
    </Stack.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

export default function App() {
  const [pb, setPb] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize PocketBase with AsyncStorage
        const client = await initializePocketBase();
        setPb(client);

        // Set up auth change listener
        const unsubscribe = client.authStore.onChange((token, model) => {
          console.log("Auth state changed:", !!model);
          setIsAuthenticated(!!model);
          setIsLoading(false);
        }, true);

        return () => unsubscribe();
      } catch (error) {
        console.error("Initialization error:", error);
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  if (isLoading) {
    // Show loading indicator until PocketBase confirms auth state
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={AcadEaseTheme.colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={AcadEaseTheme}>
        <NavigationContainer>
          {isAuthenticated ? <AppStack /> : <AuthStack />}
          <StatusBar style="auto" />
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AcadEaseTheme.colors.background, // Optional: Match theme background
  },
});
