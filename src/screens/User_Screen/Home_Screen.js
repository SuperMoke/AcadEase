import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../../components/Header";

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    title: {
      marginBottom: theme.custom.spacing.lg,
      color: theme.colors.primary,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.custom.spacing.md,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    menuItemText: {
      marginLeft: 12,
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.primary,
    },
    menuIcon: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
  });

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Welcome to AcadEase!
        </Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Tasks")}
        >
          <View style={styles.menuIcon}>
            <Icon
              name="checkbox-marked-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.menuItemText}>Manage Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("AskAI")}
        >
          <View style={styles.menuIcon}>
            <Icon name="brain" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.menuItemText}>Ask Ai</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Calendar")}
        >
          <View style={styles.menuIcon}>
            <Icon name="calendar" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.menuItemText}>Calendar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;
