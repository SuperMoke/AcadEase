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

const RegisterScreen = ({ navigation }) => {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [name, setName] = useState(""); // Add name state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false); // Add loading state
  const [error, setError] = useState(null); // Add error state

  const handleRegister = async () => {
    setError(null); // Clear previous errors
    if (password !== confirmPassword) {
      Alert.alert("Registration Failed", "Passwords don't match!");
      return;
    }
    if (!name.trim()) {
      // Basic validation for name
      Alert.alert("Registration Failed", "Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      // Pass name to the register function
      const result = await authService.register(
        email,
        name,
        password,
        confirmPassword
      );
      if (result.success) {
        console.log("Registration successful, user logged in:", result.user);
        // Navigate to Home after successful registration and auto-login
        navigation.replace("Home");
      } else {
        console.error("Registration failed:", result.message, result.data);
        const errorMessage =
          result.message || "An error occurred during registration.";
        // Attempt to provide more specific feedback if possible
        if (result.data?.data?.email?.message) {
          setError(`Email: ${result.data.data.email.message}`);
        } else if (result.data?.data?.password?.message) {
          setError(`Password: ${result.data.data.password.message}`);
        } else if (result.data?.data?.name?.message) {
          setError(`Name: ${result.data.data.name.message}`);
        } else {
          setError(errorMessage);
        }
        Alert.alert("Registration Failed", error || errorMessage);
      }
    } catch (err) {
      // Catch unexpected errors
      console.error("Unexpected registration error:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      setError(errorMessage);
      Alert.alert("Registration Error", errorMessage);
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
    loginButton: {
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
        Create Account
      </Text>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Display error */}
      <TextInput
        label="Name" // Add Name input
        value={name}
        onChangeText={setName}
        style={styles.input}
        autoCapitalize="words"
        mode="outlined"
        disabled={loading} // Disable input when loading
      />
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
      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry
        mode="outlined"
        disabled={loading} // Disable input when loading
      />
      <Button
        mode="contained"
        onPress={handleRegister}
        style={styles.button}
        disabled={loading} // Disable button when loading
        loading={loading} // Show loading indicator on button
      >
        {loading ? "Registering..." : "Register"}
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.navigate("Login")}
        style={styles.loginButton}
        textColor={theme.colors.primary}
        disabled={loading} // Disable button when loading
      >
        Already have an account? Login
      </Button>
    </View>
  );
};

export default RegisterScreen;
