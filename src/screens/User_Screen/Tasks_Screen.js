import React, { useState, useEffect } from "react"; // Add useEffect
import { View, StyleSheet, Alert, FlatList } from "react-native"; // Add FlatList
import {
  Text,
  useTheme,
  Button,
  Portal,
  Modal,
  TextInput,
  FAB, // Keep FAB import for FAB.Group
  Card, // Import Card
  List, // Import List
  Divider, // Import Divider
  ActivityIndicator, // Import ActivityIndicator
  SegmentedButtons,
} from "react-native-paper";
import Header from "../../components/Header"; // Assuming you want the same header
import ManualInputModal from "../../components/ManualInputModal"; // Import the modal component
import VoiceInputModal from "../../components/VoiceInputModal"; // Import the new component
import { authService, taskService } from "../../utils/pocketbaseService"; // Import taskService (will create this next)
import TextRecognitionModal from "../../components/TextRecognitionModal"; // Import our new component
import { format } from "date-fns"; // Add this import for date formatting
import GoogleClassroomModal from "../../components/GoogleClassroomModal";

const TasksScreen = ({ navigation }) => {
  const theme = useTheme();
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false); // Keep for future use
  const [textRecModalVisible, setTextRecModalVisible] = useState(false); // Keep for future use
  const [tasks, setTasks] = useState([]); // Add state for tasks
  const [fabOpen, setFabOpen] = useState(false); // State for FAB Group
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [value, setValue] = React.useState("");
  const [classroomModalVisible, setClassroomModalVisible] = useState(false);

  // Fetch tasks when the component mounts
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      // Optionally handle case where user is somehow logged out
      // but on this screen (might indicate an issue)
      setIsLoading(false);
      return;
    }
    try {
      const result = await taskService.getTasksByUser(currentUser.id);
      if (result.success) {
        setTasks(result.tasks);
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

  const showManualModal = () => setManualModalVisible(true);
  const hideManualModal = () => setManualModalVisible(false);

  const showVoiceModal = () => setVoiceModalVisible(true);
  const hideVoiceModal = () => setVoiceModalVisible(false);

  const showTextRecModal = () => setTextRecModalVisible(true);
  const hideTextRecModal = () => setTextRecModalVisible(false);

  const showClassroomModal = () => setClassroomModalVisible(true);
  const hideClassroomModal = () => setClassroomModalVisible(false);

  // Function to handle saving a task from the modal and PocketBase
  const handleSaveTask = async (newTaskData) => {
    console.log("Attempting to save task:", newTaskData);
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to save tasks.");
      return;
    }

    try {
      // Prepare data for PocketBase (assuming taskService exists)
      const dataToSave = {
        title: newTaskData.title,
        description: newTaskData.description,
        priority: newTaskData.priority,
        deadline: newTaskData.deadline,
        user: currentUser.id,
        completed: false,
      };

      // Call the taskService to save the task
      const result = await taskService.createTask(dataToSave);

      if (result.success) {
        // Update local state with the actual saved task from PocketBase
        // setTasks([...tasks, result.task]); // Prepend new task for better UX
        setTasks([result.task, ...tasks]);
      } else {
        // Handle the error if saving failed
        throw new Error(result.message || "Failed to save task to database.");
      }

      hideManualModal(); // Close the modal after saving
    } catch (error) {
      console.error("Failed to save task:", error);
      Alert.alert("Save Failed", error.message || "Could not save the task.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      // Confirm deletion with the user
      Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            const result = await taskService.deleteTask(taskId);

            if (result.success) {
              // Remove the task from the local state
              setTasks(tasks.filter((task) => task.id !== taskId));
              Alert.alert("Success", "Task deleted successfully");
            } else {
              Alert.alert("Error", result.message || "Failed to delete task");
            }
            setIsLoading(false);
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to delete task:", error);
      Alert.alert("Delete Failed", "Could not delete the task.");
      setIsLoading(false);
    }
  };

  const formatDeadline = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  const isDeadlineNear = (dateString) => {
    try {
      const deadline = new Date(dateString);
      const today = new Date();
      // Calculate days difference
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Return true if deadline is within 2 days
      return diffDays <= 2 && diffDays >= 0;
    } catch (error) {
      return false;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
      // Removed alignItems: 'center' to allow FAB group positioning
    },
    title: {
      marginBottom: theme.custom.spacing.lg,
      color: theme.colors.primary,
      alignSelf: "flex-start",
    },
    fabGroup: {
      // Renamed style for clarity
      position: "absolute",
      margin: 16,
      right: 0,
      bottom: 0,
    },
    taskListContainer: {
      // Style for the task list area
      flex: 1, // Take remaining space
      marginTop: theme.custom.spacing.md,
    },
    taskCard: {
      // Style for individual task cards
      marginBottom: theme.custom.spacing.sm,
    },
    priorityBadge: {
      // Style for the priority indicator
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start", // Align badge to the start
      marginTop: 4,
      fontSize: 10,
      fontWeight: "bold",
    },
    lowPriority: {
      backgroundColor: theme.colors.primaryContainer,
      color: theme.colors.onPrimaryContainer,
    },
    highPriority: {
      backgroundColor: theme.colors.errorContainer,
      color: theme.colors.onErrorContainer,
    },
    emptyListText: {
      textAlign: "center",
      marginTop: 50,
      color: theme.colors.onSurfaceVariant,
    },
  });

  // Helper to render each task item
  const renderTaskItem = ({ item }) => (
    <Card style={styles.taskCard} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium">{item.title}</Text>
        {item.description ? (
          <Text
            variant="bodyMedium"
            style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}
          >
            {item.description}
          </Text>
        ) : null}
        {item.deadline && (
          <Text
            variant="bodyMedium"
            style={{
              marginTop: 4,
              color: isDeadlineNear(item.deadline)
                ? theme.colors.error
                : theme.colors.onSurfaceVariant,
              fontWeight: isDeadlineNear(item.deadline) ? "bold" : "normal",
            }}
          >
            Due: {formatDeadline(item.deadline)}
          </Text>
        )}
        <Text
          style={[
            styles.priorityBadge,
            item.priority === "High" ? styles.highPriority : styles.lowPriority,
          ]}
        >
          {item.priority.toUpperCase()} PRIORITY
        </Text>
      </Card.Content>
      <Card.Actions>
        <Button
          icon="delete"
          mode="text"
          textColor={theme.colors.error}
          onPress={() => handleDeleteTask(item.id)}
        >
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );

  // Add this function to filter and sort tasks based on the selected segment
  const getFilteredAndSortedTasks = () => {
    // First filter by priority if needed
    let filteredTasks = tasks;
    if (value === "High" || value === "Low") {
      filteredTasks = tasks.filter((task) => task.priority === value);
    }

    // Then sort by due date (closest first)
    return filteredTasks.sort((a, b) => {
      // If both tasks have deadlines, sort by closest date
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      // If only a has a deadline, prioritize it
      else if (a.deadline) {
        return -1;
      }
      // If only b has a deadline, prioritize it
      else if (b.deadline) {
        return 1;
      }
      // If neither has a deadline, maintain current order
      return 0;
    });
  };

  return (
    <View style={styles.container}>
      <Header />
      {/* Render the Manual Input Modal */}
      <ManualInputModal
        visible={manualModalVisible}
        onDismiss={hideManualModal}
        onSave={handleSaveTask}
      />

      <VoiceInputModal
        visible={voiceModalVisible}
        onDismiss={hideVoiceModal}
        onSave={handleSaveTask}
      />

      <TextRecognitionModal
        visible={textRecModalVisible}
        onDismiss={hideTextRecModal}
        onSave={handleSaveTask}
      />

      <GoogleClassroomModal
        visible={classroomModalVisible}
        onDismiss={hideClassroomModal}
        onSave={handleSaveTask}
      />

      {/* Placeholder Modals for future features */}
      {/* <VoiceInputModal visible={voiceModalVisible} onDismiss={hideVoiceModal} onSave={handleSaveTask} /> */}
      {/* <TextRecognitionModal visible={textRecModalVisible} onDismiss={hideTextRecModal} onSave={handleSaveTask} /> */}

      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Manage Tasks
        </Text>

        <View style={styles.segmentedButtonContainer}>
          <SegmentedButtons
            value={value}
            onValueChange={setValue}
            buttons={[
              {
                value: "All",
                label: "All",
                icon: "filter-variant",
              },
              {
                value: "High",
                label: "High",
                icon: "arrow-up-bold-outline",
              },
              {
                value: "Low",
                label: "Low",
                icon: "arrow-down-bold-outline",
              },
            ]}
            style={{ marginBottom: 16 }}
            theme={{
              colors: {
                secondaryContainer: "#0066FF",
                onSecondaryContainer: "white",
              },
            }}
          />
        </View>

        {/* Task List */}
        <View style={styles.taskListContainer}>
          {isLoading ? (
            <ActivityIndicator
              animating={true}
              color={theme.colors.primary}
              size="large"
              style={{ marginTop: 50 }}
            />
          ) : (
            <FlatList
              data={getFilteredAndSortedTasks()}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={() => (
                <Text style={styles.emptyListText}>
                  {value !== "All"
                    ? `No ${value} priority tasks found.`
                    : "No tasks yet. Add one using the '+' button!"}
                </Text>
              )}
              contentContainerStyle={
                getFilteredAndSortedTasks().length === 0
                  ? { flexGrow: 1, justifyContent: "center" }
                  : {}
              }
            />
          )}
        </View>
      </View>

      {/* Replace single FAB with FAB.Group */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? "close" : "plus"}
          actions={[
            {
              icon: "pencil",
              label: "Manual Input",
              onPress: showManualModal,
              small: false,
              fabStyle: { backgroundColor: theme.colors.primary },
            },
            {
              icon: "microphone",
              label: "Voice Recognition",
              onPress: showVoiceModal,
              small: false,
              fabStyle: { backgroundColor: theme.colors.primary }, // Custom background color
            },
            {
              icon: "text-recognition",
              label: "Text Recognition",
              onPress: showTextRecModal,
              small: false,
              fabStyle: { backgroundColor: theme.colors.primary }, // Custom background colo
            },
            {
              icon: "google-classroom",
              label: "Google Classroom",
              onPress: showClassroomModal,
              small: false,
              fabStyle: { backgroundColor: theme.colors.primary },
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          onPress={() => {
            // This onPress is for the main FAB button itself
          }}
          style={styles.fabGroup}
        />
      </Portal>
    </View>
  );
};

export default TasksScreen;
