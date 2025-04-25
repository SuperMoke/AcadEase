import React, { useState, useEffect, memo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  useTheme,
  SegmentedButtons,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";

const ManualInputModal = ({ visible, onDismiss, onSave }) => {
  const theme = useTheme();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState("Low");
  const [status, setStatus] = useState("Not Started");
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset values when modal opens
      setTaskTitle("");
      setTaskDescription("");
      setPriority("Low");
    }
  }, [visible]);

  const handleSave = () => {
    if (!taskTitle.trim()) {
      alert("Please enter a task title.");
      return;
    }
    onSave({
      title: taskTitle,
      description: taskDescription,
      priority: priority,
      status,
      deadline: deadline.toISOString(),
    });

    onDismiss();
  };

  const handleCancel = () => {
    onDismiss();
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const styles = StyleSheet.create({
    modalContainer: {
      backgroundColor: theme.colors.background,
      padding: theme.custom.spacing.lg,
      margin: theme.custom.spacing.lg,
      borderRadius: theme.roundness,
    },
    title: {
      marginBottom: theme.custom.spacing.md,
      textAlign: "center",
      color: theme.colors.primary,
    },
    input: {
      marginBottom: theme.custom.spacing.md,
    },
    priorityLabel: {
      marginBottom: theme.custom.spacing.xs,
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginLeft: theme.custom.spacing.xs,
    },
    segmentedButtonContainer: {
      marginBottom: theme.custom.spacing.md,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: theme.custom.spacing.md,
    },
    button: {
      marginLeft: theme.custom.spacing.sm,
    },
  });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Add Task Manually
        </Text>
        <TextInput
          label="Task Title *"
          value={taskTitle}
          onChangeText={setTaskTitle}
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Description (Optional)"
          value={taskDescription}
          onChangeText={setTaskDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Text style={styles.priorityLabel}>Priority</Text>
        <SegmentedButtons
          value={priority}
          onValueChange={setPriority}
          style={styles.segmentedButtonContainer}
          buttons={[
            {
              value: "Low",
              label: "Low",
              style: {
                backgroundColor:
                  priority === "Low"
                    ? theme.colors.primaryContainer
                    : undefined,
              },
            },
            {
              value: "High",
              label: "High",
              style: {
                backgroundColor:
                  priority === "High" ? theme.colors.errorContainer : undefined,
              },
            },
          ]}
        />

        <Text style={styles.priorityLabel}>Deadline</Text>
        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={styles.dateButton}
        >
          {formatDate(deadline)}
        </Button>

        {showDatePicker && (
          <DateTimePicker
            value={deadline}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
        <View style={styles.buttonContainer}>
          <Button
            onPress={handleCancel}
            style={styles.button}
            textColor={theme.colors.error}
          >
            Cancel
          </Button>
          <Button mode="contained" onPress={handleSave} style={styles.button}>
            Save Task
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

export default memo(ManualInputModal);
