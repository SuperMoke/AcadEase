import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  ActivityIndicator,
  Surface,
  useTheme,
} from "react-native-paper";
import { Mic, MicOff, StopCircle } from "lucide-react-native";
import { analyzeAudioWithAI } from "../utils/aiService";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

const VoiceInputModal = ({ visible, onDismiss, onSave }) => {
  const theme = useTheme();
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState("00:00");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState(null);
  const [recordingUri, setRecordingUri] = useState("");
  const [timer, setTimer] = useState(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Reset state when modal opens
    if (visible) {
      setIsRecording(false);
      setRecordingTime("00:00");
      setIsProcessing(false);
      setRecordedAudioBase64(null);
      setSeconds(0);

      // Set up audio mode
      setupAudio();
    }

    // Cleanup when component unmounts or modal closes
    return () => {
      if (recording) {
        stopRecording();
      }
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [visible]);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });
    } catch (error) {
      console.error("Failed to set audio mode:", error);
    }
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone permission is needed to record audio."
        );
        return;
      }

      // Create recording object
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);

      // Start timer for recording duration
      const intervalId = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          const minutes = Math.floor(newSeconds / 60);
          const seconds = newSeconds % 60;
          setRecordingTime(
            `${minutes.toString().padStart(2, "0")}:${seconds
              .toString()
              .padStart(2, "0")}`
          );
          return newSeconds;
        });
      }, 1000);

      setTimer(intervalId);

      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert(
        "Recording Error",
        "Could not start recording. Please try again."
      );
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) {
        return;
      }

      // Stop the timer
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }

      // Stop recording
      await recording.stopAndUnloadAsync();

      // Get the recording URI
      const uri = recording.getURI();
      setRecordingUri(uri);

      // Convert the recorded audio to base64
      const base64Audio = await convertAudioToBase64(uri);
      setRecordedAudioBase64(base64Audio);

      setIsRecording(false);
      setRecording(null);

      console.log("Recording stopped, URI:", uri);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert(
        "Recording Error",
        "Could not stop recording. Please try again."
      );
    }
  };

  const convertAudioToBase64 = async (uri) => {
    try {
      // Use expo-file-system to read the file and convert to base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error("Failed to convert audio to base64:", error);
      throw error;
    }
  };

  const processAudio = async () => {
    if (!recordedAudioBase64) {
      Alert.alert(
        "Error",
        "No audio recording found. Please record audio first."
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Send the base64 audio to the AI service
      const aiResult = await analyzeAudioWithAI(recordedAudioBase64);

      // Create task data from AI analysis
      const taskData = {
        title: aiResult.title,
        description: aiResult.description,
        priority: aiResult.priorityLevel,
        deadline: aiResult.deadline,
      };

      // Save the task
      onSave(taskData);

      // Close the modal
      onDismiss();
    } catch (error) {
      console.error("Failed to process audio:", error);
      Alert.alert(
        "Processing Error",
        "Could not analyze your audio. Please try again or use manual input."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setRecordedAudioBase64(null);
    onDismiss();
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      padding: 20,
      borderRadius: 8,
      margin: 20,
    },
    title: {
      marginBottom: 20,
      textAlign: "center",
    },
    recordingContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 30,
    },
    recordingTime: {
      fontSize: 24,
      marginTop: 10,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 20,
    },
    recordButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isRecording ? theme.colors.error : theme.colors.primary,
    },
    processingText: {
      textAlign: "center",
      marginTop: 10,
    },
  });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Voice Task Input
        </Text>

        <View style={styles.recordingContainer}>
          {isProcessing ? (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.processingText}>
                Processing your audio...
              </Text>
            </>
          ) : recordedAudioBase64 ? (
            <>
              <Text>Recording complete!</Text>
              <Text>Ready to analyze and create task</Text>
            </>
          ) : (
            <>
              <Surface style={styles.recordButton} elevation={3}>
                {isRecording ? (
                  <StopCircle
                    size={40}
                    color={theme.colors.onError}
                    onPress={stopRecording}
                  />
                ) : (
                  <Mic
                    size={40}
                    color={theme.colors.onPrimary}
                    onPress={startRecording}
                  />
                )}
              </Surface>
              <Text style={styles.recordingTime}>
                {isRecording ? recordingTime : "Tap to start recording"}
              </Text>
            </>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Button mode="outlined" onPress={cancelRecording}>
            Cancel
          </Button>

          {recordedAudioBase64 && !isProcessing && (
            <Button mode="contained" onPress={processAudio}>
              Create Task
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
};

export default VoiceInputModal;
