import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  useTheme,
  TextInput,
  Button,
  Avatar,
  IconButton,
} from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../../components/Header";
import { taskService, authService } from "../../utils/pocketbaseService";
import { processMessageWithTaskContext } from "../../utils/aiService";

const AskAiScreen = ({ navigation }) => {
  const theme = useTheme();
  const [message, setMessage] = useState("");
  const currentUser = authService.getCurrentUser();
  const [userTasks, setUserTasks] = useState([]);
  const [taskContext, setTaskContext] = useState("");
  const [isContextLoaded, setIsContextLoaded] = useState(false);

  const [conversation, setConversation] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null); // Ref for TextInput
  const userId = currentUser?.id;

  useEffect(() => {
    fetchUserTasks();

    // Auto-focus on TextInput when the screen loads
    inputRef.current?.focus();

    // Also refresh tasks when screen receives focus
    const unsubscribe = navigation.addListener("focus", () => {
      fetchUserTasks();
      inputRef.current?.focus(); // Re-focus on TextInput when screen is focused
    });

    return unsubscribe;
  }, [userId, navigation]);

  const fetchUserTasks = async () => {
    if (!userId) {
      console.log("No user ID available, can't fetch tasks");
      return;
    }

    try {
      const result = await taskService.getTasksByUser(userId);
      if (result.success) {
        setUserTasks(result.tasks);
        setIsContextLoaded(true);
        console.log(`Loaded ${result.tasks.length} tasks for AI context`);
      } else {
        console.error("Failed to load tasks:", result.message);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    // Add user message to conversation
    const userMessage = {
      id: conversation.length + 1,
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setConversation([...conversation, userMessage]);
    setIsLoading(true);

    try {
      // Process the message with task context
      const response = await processMessageWithTaskContext(message, userTasks);

      // Add AI response to conversation
      const aiResponse = {
        id: conversation.length + 2,
        text: response.success
          ? response.text
          : "I'm sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setConversation((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error processing message:", error);

      // Add error message to conversation
      const errorResponse = {
        id: conversation.length + 2,
        text: "Sorry, I encountered an error while processing your request.",
        isUser: false,
        timestamp: new Date(),
      };

      setConversation((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      setMessage("");
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
    },
    title: {
      marginBottom: theme.custom.spacing.md,
      color: theme.colors.primary,
    },
    conversationContainer: {
      flex: 1,
    },
    messageRow: {
      flexDirection: "row",
      marginBottom: 16,
      alignItems: "flex-start",
    },
    userMessageRow: {
      justifyContent: "flex-end",
    },
    messageBubble: {
      maxWidth: "80%",
      padding: 12,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryContainer,
    },
    userMessageBubble: {
      backgroundColor: theme.colors.primary,
    },
    messageText: {
      color: theme.colors.onPrimaryContainer,
    },
    userMessageText: {
      color: theme.colors.onPrimary,
    },
    avatar: {
      marginRight: 8,
      backgroundColor: theme.colors.primaryContainer,
    },
    inputContainer: {
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceVariant,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 24,
      elevation: 2,
    },
    inputInnerContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    input: {
      flex: 1,
      backgroundColor: "transparent",
      paddingHorizontal: 4,
    },
    sendButton: {
      marginLeft: 8,
      borderRadius: 20,
      overflow: "hidden",
    },
    loadingText: {
      fontStyle: "italic",
      color: theme.colors.outline,
      marginBottom: 16,
      marginLeft: 48,
    },
  });

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Ask AI Assistant
        </Text>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.conversationContainer}
          keyboardVerticalOffset={120}
        >
          <ScrollView
            style={styles.conversationContainer}
            contentContainerStyle={{ paddingBottom: 16 }}
            ref={scrollViewRef}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {conversation.map((msg) => (
              <View
                key={msg.id}
                style={[styles.messageRow, msg.isUser && styles.userMessageRow]}
              >
                {!msg.isUser && (
                  <Avatar.Icon size={36} icon="robot" style={styles.avatar} />
                )}
                <View
                  style={[
                    styles.messageBubble,
                    msg.isUser && styles.userMessageBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.isUser && styles.userMessageText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}

            {isLoading && (
              <Text style={styles.loadingText}>AI is thinking...</Text>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.inputInnerContainer}>
              <TextInput
                mode="flat"
                style={styles.input}
                placeholder="Type your question here... (e.g., 'What tasks are due today?')"
                value={message}
                onChangeText={setMessage}
                multiline
                maxHeight={100}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                ref={inputRef} // Attach ref to TextInput
                right={
                  message ? (
                    <TextInput.Icon
                      name="close-circle"
                      onPress={() => setMessage("")}
                    />
                  ) : null
                }
              />
              <Button
                mode="contained"
                onPress={handleSend}
                disabled={isLoading || !message.trim()}
                icon={isLoading ? "loading" : "send"}
                loading={isLoading}
                style={styles.sendButton}
              >
                {isLoading ? "Sending" : "Send"}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

export default AskAiScreen;
