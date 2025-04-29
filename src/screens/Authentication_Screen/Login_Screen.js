import React, { useState } from "react"; // Import useState
import { View, StyleSheet, Alert, Image } from "react-native"; // Import Alert
import {
  Text,
  Button,
  TextInput,
  useTheme,
  ActivityIndicator,
} from "react-native-paper"; // Import ActivityIndicator
import { authService } from "../../utils/pocketbaseService"; // Import authService

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        console.log("Login successful:", result.user);
      } else {
        console.error("Login failed:", result.message);

        setError(result.message);
        Alert.alert(
          "Login Failed",
          result.message || "An error occurred during login."
        );
      }
    } catch (err) {
      // This catch block might be redundant if handlePocketBaseError catches everything,
      // but it's good practice for unexpected issues.
      console.error("Unexpected login error:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      setError(errorMessage);
      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.custom.spacing.md,
      backgroundColor: theme.colors.background,
    },

    title: {
      marginBottom: theme.custom.spacing.lg,
      color: theme.colors.primary,
    },
    logo: {
      width: 250,
      height: 250,
    },
    input: {
      width: "100%",
      marginBottom: theme.custom.spacing.md,
    },
    button: {
      width: "100%",
      marginTop: theme.custom.spacing.sm,
      paddingVertical: theme.custom.spacing.xs,
    },
    registerButton: {
      marginTop: theme.custom.spacing.md,
    },
    errorText: {
      // Style for error messages
      color: theme.colors.error,
      marginBottom: theme.custom.spacing.sm,
      textAlign: "center",
    },
  });

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/Logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text variant="headlineLarge" style={styles.title}>
        Welcome Back!
      </Text>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Display error */}
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        mode="outlined"
        disabled={loading} // Disable input when loading
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        mode="outlined"
        disabled={loading} // Disable input when loading
      />
      <Button
        mode="contained"
        onPress={handleLogin}
        style={styles.button}
        disabled={loading} // Disable button when loading
        loading={loading} // Show loading indicator on button
      >
        {loading ? "Logging in..." : "Login"}
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.navigate("Register")}
        style={styles.registerButton}
        textColor={theme.colors.primary}
        disabled={loading} // Disable button when loading
      >
        Don't have an account? Register
      </Button>
    </View>
  );
};

export default LoginScreen;
