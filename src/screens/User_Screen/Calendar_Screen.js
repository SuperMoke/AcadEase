import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, FlatList, Alert } from "react-native";
import {
  Text,
  useTheme,
  ActivityIndicator,
  List,
  Divider,
} from "react-native-paper";
import { Calendar } from "react-native-calendars"; // Import Calendar
import Header from "../../components/Header";
import { authService, taskService } from "../../utils/pocketbaseService";
import { format, parseISO, formatISO } from "date-fns"; // Import date-fns functions

const Calendar_Screen = () => {
  const theme = useTheme();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  ); // Today's date initially
  const [tasksForSelectedDate, setTasksForSelectedDate] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Effect to update marked dates when tasks change or selected date changes
  useEffect(() => {
    const markers = {};
    tasks.forEach((task) => {
      if (task.deadline) {
        try {
          // PocketBase stores dates as ISO strings (e.g., "2023-10-27 10:00:00.123Z")
          // We need to parse it and format to 'yyyy-MM-dd'
          const dateStr = format(parseISO(task.deadline), "yyyy-MM-dd");
          if (markers[dateStr]) {
            // If date already marked, add another dot
            markers[dateStr].dots.push({
              key: task.id,
              color:
                task.priority === "High"
                  ? theme.colors.error
                  : theme.colors.primary,
            });
            // Ensure selected styling persists if it's the selected date
            markers[dateStr].selected = dateStr === selectedDate;
          } else {
            markers[dateStr] = {
              dots: [
                {
                  key: task.id,
                  color:
                    task.priority === "High"
                      ? theme.colors.error
                      : theme.colors.primary,
                },
              ],
              marked: true,
              // Add selected styling if this date is the currently selected one
              selected: dateStr === selectedDate,
              selectedColor: theme.colors.primaryContainer, // Or your preferred selection color
              selectedTextColor: theme.colors.onPrimaryContainer,
            };
          }
        } catch (e) {
          console.error(
            "Error parsing date for task:",
            task.id,
            task.deadline,
            e
          );
        }
      }
    });

    // Ensure the selected date always has the selected style, even if no tasks are due
    if (!markers[selectedDate]) {
      markers[selectedDate] = {
        selected: true,
        selectedColor: theme.colors.primaryContainer,
        selectedTextColor: theme.colors.onPrimaryContainer,
        marked: false, // Keep marked false if no tasks are actually due
        dots: [], // Ensure dots array exists even if empty
      };
    } else {
      markers[selectedDate].selected = true;
      markers[selectedDate].selectedColor = theme.colors.primaryContainer;
      markers[selectedDate].selectedTextColor = theme.colors.onPrimaryContainer;
    }

    setMarkedDates(markers);
  }, [tasks, theme.colors, selectedDate]); // Re-run when tasks, theme or selectedDate change

  // Effect to update the list of tasks for the selected date
  useEffect(() => {
    const tasksOnDate = tasks.filter((task) => {
      if (!task.deadline) return false;
      try {
        const taskDateStr = format(parseISO(task.deadline), "yyyy-MM-dd");
        return taskDateStr === selectedDate;
      } catch (e) {
        return false;
      }
    });
    // Sort tasks for the selected date, e.g., by priority then title
    tasksOnDate.sort((a, b) => {
      const priorityOrder = { High: 0, Low: 1 }; // Define priority order
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.title.localeCompare(b.title); // Then sort by title alphabetically
    });
    setTasksForSelectedDate(tasksOnDate);
  }, [selectedDate, tasks]);

  const fetchTasks = async () => {
    setIsLoading(true);
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    try {
      // Fetch all tasks for simplicity, could optimize later to fetch by date range
      const result = await taskService.getTasksByUser(currentUser.id);
      if (result.success) {
        // Filter tasks that have a deadline for calendar marking
        const tasksWithDeadlines = result.tasks.filter(
          (task) => !!task.deadline
        );
        setTasks(tasksWithDeadlines);
      } else {
        Alert.alert("Error", result.message || "Failed to fetch tasks.");
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      Alert.alert("Fetch Failed", "Could not load your tasks.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayPress = (day) => {
    // day.dateString is in 'yyyy-MM-dd' format
    setSelectedDate(day.dateString);
  };

  const renderTaskItem = ({ item }) => (
    <List.Item
      title={item.title}
      description={item.description || "No description"}
      left={(props) => (
        <List.Icon
          {...props}
          icon={item.priority === "High" ? "alert-circle" : "circle-slice-8"} // Different icons for priority
          color={
            item.priority === "High" ? theme.colors.error : theme.colors.primary
          }
        />
      )}
      style={styles.taskItem}
      titleStyle={{ color: theme.colors.onSurface }}
      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
    />
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    calendar: {
      // Add specific styling for the calendar if needed
      // e.g., borderBottomWidth: 1, borderBottomColor: theme.colors.outline
    },
    taskListContainer: {
      flex: 1, // Take remaining space
      paddingHorizontal: 16,
      paddingBottom: 16, // Add padding at the bottom
    },
    listHeader: {
      marginTop: 16,
      marginBottom: 8,
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    taskItem: {
      backgroundColor: theme.colors.surfaceVariant, // Subtle background for items
      borderRadius: theme.roundness,
      marginBottom: 8,
    },
    emptyListText: {
      textAlign: "center",
      marginTop: 40, // More margin for empty list
      color: theme.colors.onSurfaceVariant,
      fontSize: 16,
    },
  });

  // Format the selected date for display
  const formattedSelectedDate = useMemo(() => {
    try {
      // Parse the 'yyyy-MM-dd' string and format it nicely
      const date = parseISO(selectedDate + "T00:00:00"); // Add time part to parse correctly
      return format(date, "EEEE, MMMM d, yyyy"); // e.g., "Monday, October 27, 2023"
    } catch (e) {
      console.error("Error formatting selected date:", e);
      return "Selected Date";
    }
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <Header />
      {isLoading && !tasks.length ? ( // Show loading indicator only initially
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            animating={true}
            color={theme.colors.primary}
            size="large"
          />
        </View>
      ) : (
        <>
          <Calendar
            // Specify theme properties to match react-native-paper
            theme={{
              backgroundColor: theme.colors.background,
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.onSurfaceVariant,
              selectedDayBackgroundColor: theme.colors.primaryContainer, // Use container color
              selectedDayTextColor: theme.colors.onPrimaryContainer, // Use on container color
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.onSurface,
              textDisabledColor: theme.colors.outline, // Use outline for disabled
              dotColor: theme.colors.primary, // Default dot color
              selectedDotColor: theme.colors.onPrimaryContainer, // Dots on selected day
              arrowColor: theme.colors.primary,
              disabledArrowColor: theme.colors.outline,
              monthTextColor: theme.colors.primary,
              indicatorColor: theme.colors.primary,
              // textDayFontFamily: 'monospace', // Optional: Add custom fonts if needed
              // textMonthFontFamily: 'monospace',
              // textDayHeaderFontFamily: 'monospace',
              textDayFontWeight: "400", // Regular weight
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "500", // Medium weight
              textDayFontSize: 15,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            // Handler which gets executed on day press. Default = undefined
            onDayPress={handleDayPress}
            // Collection of dates that have to be marked. Default = {}
            markedDates={markedDates}
            // Specify how dots are marking single dates
            markingType={"multi-dot"} // Use 'multi-dot' to show multiple tasks per day
            // Initially visible month. Default = Date()
            current={selectedDate} // Keep calendar focused on the selected date month
            style={styles.calendar}
            // Enable month change arrows even if disabled dates are present
            // disabledByDefault={false}
          />

          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />

          <View style={styles.taskListContainer}>
            <Text variant="titleMedium" style={styles.listHeader}>
              Tasks for {formattedSelectedDate}:
            </Text>
            {isLoading &&
              tasks.length > 0 && ( // Show subtle loading when refetching/filtering
                <ActivityIndicator
                  animating={true}
                  color={theme.colors.primary}
                  style={{ marginVertical: 10 }}
                />
              )}
            <FlatList
              data={tasksForSelectedDate}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={() => (
                <Text style={styles.emptyListText}>
                  No tasks due on this day.
                </Text>
              )}
              // Optional: Add RefreshControl if you want pull-to-refresh
              // refreshControl={
              //   <RefreshControl refreshing={isLoading} onRefresh={fetchTasks} />
              // }
            />
          </View>
        </>
      )}
    </View>
  );
};

export default Calendar_Screen;
