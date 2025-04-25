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

// Import auth service
import { authService, pocketbaseClient } from "./src/utils/pocketbaseService";

// Prevent automatic splash screen hiding
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

// Stack for authenticated users
const AppStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="AskAI" component={AskAiScreen} />
    </Stack.Navigator>
  );
};

// Stack for unauthenticated users
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  // Function to check and update auth state
  const checkAuthState = () => {
    const isAuth = authService.isAuthenticated();
    setIsAuthenticated(isAuth);
    return isAuth;
  };

  useEffect(() => {
    async function prepare() {
      try {
        // Check initial auth state when the app loads
        checkAuthState();
      } catch (e) {
        console.warn(e);
      } finally {
        // Set app as ready
        setAppIsReady(true);
        setIsLoading(false);
      }
    }
    prepare();

    // Set up auth state change listener
    const unsubscribe = pocketbaseClient.authStore.onChange(() => {
      checkAuthState();
    });

    // Clean up the listener
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle hiding the splash screen only when ready to render
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Always render the app, but conditionally show loading indicator
  return (
    <PaperProvider theme={AcadEaseTheme}>
      <NavigationContainer onReady={onLayoutRootView}>
        <StatusBar style="auto" />
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={AcadEaseTheme.colors.primary}
            />
          </View>
        ) : isAuthenticated ? (
          <AppStack />
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
