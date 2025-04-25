import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  useTheme,
  Card,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { detectTaskDetailsFromImage } from "../utils/aiService";

const TextRecognitionModal = ({ visible, onDismiss, onSave }) => {
  const theme = useTheme();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taskDetails, setTaskDetails] = useState(null);

  const resetState = () => {
    setImage(null);
    setTaskDetails(null);
    setLoading(false);
  };

  const handleDismiss = () => {
    resetState();
    onDismiss();
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photo library"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from library");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your camera"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const processImage = async (uri) => {
    try {
      setLoading(true);

      // Read the image file as base64
      const base64Image = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call the AI service to detect task details
      const result = await detectTaskDetailsFromImage(base64Image);

      // Set the detected task details
      setTaskDetails(result);
      setLoading(false);
    } catch (error) {
      console.error("Error processing image:", error);
      setLoading(false);
      Alert.alert(
        "Processing Error",
        error.message || "Failed to analyze image"
      );
    }
  };

  const handleSaveTask = () => {
    if (!taskDetails) {
      Alert.alert("No Data", "No task details were detected");
      return;
    }

    // Format the task data for saving
    const taskData = {
      title: taskDetails.title || "Untitled Task",
      description: taskDetails.description || "",
      priority: taskDetails.priority || "Low",
      deadline: taskDetails.deadline || "",
    };

    // Call the onSave function from parent component
    onSave(taskData);
    resetState();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Task from Image
        </Text>

        {!image && !loading && (
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={takePhoto}
              style={styles.button}
              icon="camera"
            >
              Take Photo
            </Button>
            <Button
              mode="contained"
              onPress={pickImage}
              style={styles.button}
              icon="image"
            >
              Pick Image
            </Button>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Analyzing image...</Text>
          </View>
        )}

        {image && !loading && (
          <View style={styles.resultContainer}>
            <Image source={{ uri: image }} style={styles.imagePreview} />

            {taskDetails && (
              <Card style={styles.detailsCard}>
                <Card.Content>
                  <Text variant="titleLarge">
                    {taskDetails.title || "Untitled Task"}
                  </Text>
                  <Text variant="bodyMedium" style={styles.description}>
                    {taskDetails.description || "No description available"}
                  </Text>
                  <Text
                    style={[
                      styles.priorityBadge,
                      taskDetails.priority === "High"
                        ? styles.highPriority
                        : styles.lowPriority,
                    ]}
                  >
                    {taskDetails.priority.toUpperCase()} PRIORITY
                  </Text>
                </Card.Content>
              </Card>
            )}

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={resetState}
                style={styles.actionButton}
              >
                Try Again
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveTask}
                style={styles.actionButton}
                disabled={!taskDetails}
              >
                Save Task
              </Button>
            </View>
          </View>
        )}

        <Button
          mode="text"
          onPress={handleDismiss}
          style={styles.dismissButton}
        >
          Cancel
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: "80%",
  },
  title: {
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    marginVertical: 20,
  },
  button: {
    marginVertical: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
  },
  resultContainer: {
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: "contain",
  },
  detailsCard: {
    width: "100%",
    marginBottom: 16,
  },
  description: {
    marginTop: 8,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "bold",
  },
  highPriority: {
    backgroundColor: "#FFCDD2",
    color: "#B71C1C",
  },
  lowPriority: {
    backgroundColor: "#E1F5FE",
    color: "#0288D1",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 16,
  },
  actionButton: {
    width: "48%",
  },
  dismissButton: {
    marginTop: 16,
  },
});

export default TextRecognitionModal;
