import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { StatusBar } from "expo-status-bar";
import { authService } from "../utils/pocketbaseService";
import { useNavigation } from "@react-navigation/native";

const Header = () => {
  const theme = useTheme();
  const user = authService.getCurrentUser();
  const navigation = useNavigation();

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <View style={styles.header}>
      <StatusBar style="dark" />
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/heading_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.userContainer}>
        <Text style={styles.welcomeText}>Welcome, {user?.name || "Guest"}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={20} color={theme.colors.primary} />
          <Text style={[styles.logoutText, { color: theme.colors.primary }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    height: 130, // Fixed height for the header
  },
  logoContainer: {
    width: 100,
    height: 60,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  userContainer: {
    alignItems: "flex-end",
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default Header;
