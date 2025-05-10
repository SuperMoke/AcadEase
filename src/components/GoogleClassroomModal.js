import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  FlatList,
} from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  Checkbox,
  List,
  Divider,
  ActivityIndicator,
  useTheme,
  Card,
} from "react-native-paper";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";

// Define UI states
const UI_STATE = {
  NEEDS_AUTH: "NEEDS_AUTH",
  AUTHENTICATING: "AUTHENTICATING",
  FETCHING_COURSES: "FETCHING_COURSES",
  SHOW_COURSES: "SHOW_COURSES",
  FETCHING_ASSIGNMENTS: "FETCHING_ASSIGNMENTS",
  SHOW_ASSIGNMENTS: "SHOW_ASSIGNMENTS",
  ERROR: "ERROR",
};

const GoogleClassroomModal = ({ visible, onDismiss, onSave }) => {
  const theme = useTheme();

  // --- State Variables ---
  const [userInfo, setUserInfo] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [uiState, setUiState] = useState(UI_STATE.NEEDS_AUTH);
  const [errorMessage, setErrorMessage] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentsForImport, setSelectedAssignmentsForImport] =
    useState({});

  const [debugInfo, setDebugInfo] = useState([]);
  const [showDebug, setShowDebug] = useState(false);

  // --- Client IDs from app.json ---
  const webClientId = Constants.expoConfig?.extra?.googleClientId; // Your WEB Application type Client ID
  const androidClientId = Constants.expoConfig?.extra?.androidClientId;
  const iosClientId = Constants.expoConfig?.extra?.iosClientId;

  // @react-native-google-signin often uses webClientId for configuration.
  const configuredWebClientId = webClientId;

  const addDebugLog = useCallback((message) => {
    console.log(`GCM_DEBUG: ${message}`);
    setDebugInfo((prev) => [
      `${new Date().toLocaleTimeString()}: ${message}`,
      ...prev.slice(0, 29), // Keep last 30 logs
    ]);
  }, []);

  // --- Google Sign-In Configuration ---
  useEffect(() => {
    addDebugLog("Component mounted. Configuring Google Sign-In...");
    addDebugLog(`Using Web Client ID for configure: ${configuredWebClientId}`);
    if (!configuredWebClientId) {
      addDebugLog(
        "ERROR: Web Client ID (googleClientId in app.json extra) is missing. This is required for GoogleSignin.configure()."
      );
      setErrorMessage(
        "Google Client ID for web is not configured in app.json."
      );
      setUiState(UI_STATE.ERROR); // Prevent further action if essential config is missing
      return;
    }

    GoogleSignin.configure({
      webClientId: configuredWebClientId,
      scopes: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
      ],
      forceCodeForRefreshToken: true,
      // offlineAccess: true, // Uncomment if you need serverAuthCode
    });
    addDebugLog("Google Sign-In configured.");
  }, [configuredWebClientId, addDebugLog]);

  // Effect to check current sign-in state when modal becomes visible or on initial mount
  useEffect(() => {
    if (visible) {
      addDebugLog("Modal opened. Checking current Google Sign-In state.");
      checkCurrentUser();
    } else {
      addDebugLog("Modal closed.");
    }
  }, [visible, addDebugLog]); // `checkCurrentUser` is memoized or defined outside if it doesn't depend on changing props/state

  const checkCurrentUser = useCallback(async () => {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      addDebugLog(`Currently signed in: ${isSignedIn}`);
      if (isSignedIn) {
        // Instead of silent sign-in, we'll sign the user out to force account selection on next sign in
        await GoogleSignin.signOut();
        addDebugLog("Signed out to ensure account selection on next sign-in");
        setUiState(UI_STATE.NEEDS_AUTH);
        setUserInfo(null);
        setAccessToken(null);
      } else {
        setUiState(UI_STATE.NEEDS_AUTH);
        setUserInfo(null);
        setAccessToken(null);
      }
    } catch (error) {
      addDebugLog(
        `Error checking current user: ${error.message} (Code: ${error.code})`
      );
      setUiState(UI_STATE.NEEDS_AUTH);
    }
  }, [addDebugLog]); // addDebugLog is stable due to its own useCallback

  const attemptSilentSignIn = useCallback(async () => {
    try {
      addDebugLog("Attempting silent sign-in...");
      const currentUser = await GoogleSignin.signInSilently();
      setUserInfo(currentUser);
      const tokens = await GoogleSignin.getTokens();
      addDebugLog("Silent sign-in successful.");
      setAccessToken(tokens.accessToken);
      setUiState(UI_STATE.FETCHING_COURSES);
      // fetchUserCoursesInternal(tokens.accessToken); // Call directly
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_REQUIRED) {
        addDebugLog("Silent sign-in failed: Sign-in required.");
      } else {
        addDebugLog(
          `Silent sign-in error: ${error.message} (Code: ${error.code})`
        );
      }
      setUiState(UI_STATE.NEEDS_AUTH); // Fallback to manual sign-in
    }
  }, [addDebugLog]);

  // Effect to fetch courses when state is appropriate
  useEffect(() => {
    if (accessToken && uiState === UI_STATE.FETCHING_COURSES) {
      fetchUserCoursesInternal(accessToken);
    }
  }, [accessToken, uiState, addDebugLog]); // add fetchUserCoursesInternal if it's memoized

  // --- API Call Functions ---
  const fetchWithAuth = async (url, token) => {
    const headers = { Authorization: `Bearer ${token}` };
    addDebugLog(`Workspaceing: ${url}`);
    const res = await fetch(url, { headers });
    addDebugLog(`Response status: ${res.status}`);
    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: `Request failed with status ${res.status}` }));
      addDebugLog(`API Error Data: ${JSON.stringify(errorData)}`);
      const errorDetail =
        errorData.error?.message || errorData.message || `Status ${res.status}`;
      throw new Error(`Failed to fetch data: ${errorDetail}`);
    }
    return res.json();
  };

  const fetchUserCoursesInternal = useCallback(
    async (token) => {
      if (!token) {
        addDebugLog("fetchUserCoursesInternal: No token provided.");
        setUiState(UI_STATE.NEEDS_AUTH);
        setErrorMessage("Authentication token is missing.");
        return;
      }
      // No need to setUiState(FETCHING_COURSES) here if it's already set before calling this
      setErrorMessage("");
      try {
        const data = await fetchWithAuth(
          "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
          token
        );
        if (data.courses && data.courses.length > 0) {
          setCourses(data.courses);
          setUiState(UI_STATE.SHOW_COURSES);
        } else {
          setCourses([]);
          setErrorMessage("No active Google Classroom courses found.");
          setUiState(UI_STATE.SHOW_COURSES);
        }
      } catch (error) {
        addDebugLog(`Error fetching courses: ${error.message}`);
        setErrorMessage(`Failed to fetch courses: ${error.message}`);
        setUiState(UI_STATE.ERROR);
        if (
          error.message.includes("401") ||
          error.message.includes("Invalid Credentials")
        ) {
          await handleGoogleSignOut(true);
        }
      }
    },
    [addDebugLog, handleGoogleSignOut]
  ); // handleGoogleSignOut needs to be stable or memoized

  const fetchUserCoursesRevalidate = useCallback(async () => {
    setUiState(UI_STATE.FETCHING_COURSES); // Set loading state before attempting
    if (!accessToken) {
      addDebugLog(
        "fetchUserCoursesRevalidate: No access token state, attempting to get new tokens."
      );
      try {
        await GoogleSignin.hasPlayServices(); // ensure play services available
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (!isSignedIn) {
          // if not signed in, prompt sign in.
          await handleGoogleSignIn(); // this will set tokens and trigger course fetch
          return;
        }
        const tokens = await GoogleSignin.getTokens();
        setAccessToken(tokens.accessToken); // This will trigger the useEffect for fetching courses
      } catch (e) {
        addDebugLog(
          "Failed to get new tokens, user needs to sign in again: " + e.message
        );
        await handleGoogleSignOut(true);
      }
    } else {
      fetchUserCoursesInternal(accessToken);
    }
  }, [
    accessToken,
    addDebugLog,
    handleGoogleSignOut,
    handleGoogleSignIn,
    fetchUserCoursesInternal,
  ]);

  const fetchAssignmentsForCourseInternal = useCallback(
    async (courseId, token) => {
      if (!token || !courseId) {
        addDebugLog("fetchAssignmentsInternal: No token or courseId.");
        setErrorMessage("Authentication token or course ID is missing.");
        setUiState(UI_STATE.ERROR);
        return;
      }
      // No need to setUiState(FETCHING_ASSIGNMENTS) here if it's already set
      setErrorMessage("");
      setAssignments([]);
      setSelectedAssignmentsForImport({});
      try {
        const data = await fetchWithAuth(
          `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?courseWorkStates=PUBLISHED&orderBy=dueDate asc`,
          token
        );
        if (data.courseWork && data.courseWork.length > 0) {
          const mapped = data.courseWork
            .filter(
              (work) =>
                work.state === "PUBLISHED" && work.workType === "ASSIGNMENT"
            )
            .map((work) => ({
              originalId: work.id,
              title: work.title || "Untitled Assignment",
              description: work.description || "",
              courseName: selectedCourse?.name || "Unknown Course",
              priority: "Medium",
              deadline: work.dueDate
                ? new Date(
                    work.dueDate.year,
                    work.dueDate.month - 1,
                    work.dueDate.day,
                    work.dueTime?.hours || 23,
                    work.dueTime?.minutes || 59
                  ).toISOString()
                : null,
            }));
          setAssignments(mapped);
        } else {
          setAssignments([]);
          setErrorMessage("No assignments found for this course.");
        }
        setUiState(UI_STATE.SHOW_ASSIGNMENTS);
      } catch (error) {
        addDebugLog(`Error fetching assignments: ${error.message}`);
        setErrorMessage(`Failed to fetch assignments: ${error.message}`);
        setUiState(UI_STATE.ERROR);
        if (
          error.message.includes("401") ||
          error.message.includes("Invalid Credentials")
        ) {
          await handleGoogleSignOut(true);
        }
      }
    },
    [addDebugLog, selectedCourse, handleGoogleSignOut]
  );

  const fetchAssignmentsForCourseRevalidate = useCallback(
    async (courseId) => {
      if (!courseId) return;
      setUiState(UI_STATE.FETCHING_ASSIGNMENTS);
      if (!accessToken) {
        addDebugLog(
          "fetchAssignmentsForCourseRevalidate: No access token state, attempting to get new tokens."
        );
        try {
          await GoogleSignin.hasPlayServices();
          const isSignedIn = await GoogleSignin.isSignedIn();
          if (!isSignedIn) {
            await handleGoogleSignIn(); // This will set tokens and then an effect can trigger assignment fetch if course is selected
            return;
          }
          const tokens = await GoogleSignin.getTokens();
          setAccessToken(tokens.accessToken);
          fetchAssignmentsForCourseInternal(courseId, tokens.accessToken);
        } catch (e) {
          addDebugLog("Failed to get new tokens for assignments: " + e.message);
          await handleGoogleSignOut(true);
        }
      } else {
        fetchAssignmentsForCourseInternal(courseId, accessToken);
      }
    },
    [
      accessToken,
      addDebugLog,
      handleGoogleSignOut,
      handleGoogleSignIn,
      fetchAssignmentsForCourseInternal,
    ]
  );

  // --- Event Handlers ---
  const handleGoogleSignInInternal = useCallback(async () => {
    // Renamed to avoid conflict if called from revalidate
    addDebugLog("Attempting Google Sign-In...");
    setUiState(UI_STATE.AUTHENTICATING);
    setErrorMessage("");
    try {
      await GoogleSignin.hasPlayServices();
      const signedInUserInfo = await GoogleSignin.signIn();
      addDebugLog("Google Sign-In successful via handleGoogleSignInInternal.");
      setUserInfo(signedInUserInfo);
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.accessToken) {
        throw new Error(
          "Failed to obtain access token from Google Signin after signIn()."
        );
      }
      setAccessToken(tokens.accessToken);
      setUiState(UI_STATE.FETCHING_COURSES); // This will trigger the useEffect to fetch courses
    } catch (error) {
      addDebugLog(
        `Google Sign-In error: ${error.message} (Code: ${error.code})`
      );
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setErrorMessage("Google Sign-In was cancelled.");
        setUiState(UI_STATE.NEEDS_AUTH);
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setErrorMessage("Google Sign-In is already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage(
          "Google Play Services not available or outdated. (Required for Android)"
        );
        setUiState(UI_STATE.ERROR);
      } else {
        setErrorMessage(`Google Sign-In failed: ${error.message}`);
        setUiState(UI_STATE.ERROR);
      }
      setUserInfo(null); // Clear user info on any sign-in error
      setAccessToken(null); // Clear token on any sign-in error
    }
  }, [addDebugLog]);
  // Expose the internal sign-in function
  const handleGoogleSignIn = handleGoogleSignInInternal;

  const handleGoogleSignOutInternal = useCallback(
    async (isErrorSignOut = false) => {
      addDebugLog(
        `Attempting Google Sign-Out. Is error sign out: ${isErrorSignOut}`
      );
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          addDebugLog("Google Sign-Out and revoke successful.");
        } else {
          addDebugLog(
            "Already signed out or no current user session with GoogleSignIn."
          );
        }
      } catch (error) {
        addDebugLog(
          `Google Sign-Out error: ${error.message} (Code: ${error.code})`
        );
      } finally {
        setUserInfo(null);
        setAccessToken(null);
        setCourses([]);
        setSelectedCourse(null);
        setAssignments([]);
        setSelectedAssignmentsForImport({});
        setUiState(UI_STATE.NEEDS_AUTH);
        if (!isErrorSignOut) {
          setErrorMessage("");
        }
        addDebugLog("Local state cleared after sign out attempt.");
      }
    },
    [addDebugLog]
  );
  const handleGoogleSignOut = handleGoogleSignOutInternal;

  const handleSelectCourse = useCallback(
    (course) => {
      addDebugLog(`Course selected: ${course.name} (${course.id})`);
      setSelectedCourse(course);
      fetchAssignmentsForCourseRevalidate(course.id);
    },
    [addDebugLog, fetchAssignmentsForCourseRevalidate]
  );

  const toggleAssignmentSelection = useCallback((assignmentId) => {
    setSelectedAssignmentsForImport((prev) => ({
      ...prev,
      [assignmentId]: !prev[assignmentId],
    }));
  }, []);

  const handleImportTasks = useCallback(() => {
    const tasksToImport = assignments.filter(
      (asm) => selectedAssignmentsForImport[asm.originalId]
    );
    if (tasksToImport.length === 0) {
      Alert.alert(
        "No Selection",
        "Please select at least one assignment to import."
      );
      return;
    }
    addDebugLog(`Importing ${tasksToImport.length} tasks.`);
    tasksToImport.forEach((assignment) => {
      onSave({
        title: assignment.title,
        description: `From: ${assignment.courseName}\n${assignment.description}`,
        priority: assignment.priority,
        deadline: assignment.deadline,
      });
    });
    Alert.alert(
      "Import Successful",
      `${tasksToImport.length} task(s) have been imported.`
    );
    onDismiss();
    // Reset state for next time modal opens - keep user signed in
    setCourses([]);
    setSelectedCourse(null);
    setAssignments([]);
    setSelectedAssignmentsForImport({});
    // Decide if UI should go back to NEEDS_AUTH or SHOW_COURSES
    // If user is still signed in, probably SHOW_COURSES is better
    if (userInfo && accessToken) {
      setUiState(UI_STATE.SHOW_COURSES); // Or fetch courses again if needed
    } else {
      setUiState(UI_STATE.NEEDS_AUTH);
    }
  }, [
    assignments,
    selectedAssignmentsForImport,
    onSave,
    onDismiss,
    addDebugLog,
    userInfo,
    accessToken,
  ]);

  // --- Render Functions for different UI States ---
  const renderAuthScreen = () => (
    <View style={styles.centeredContent}>
      <List.Icon icon="school-outline" size={64} style={{ marginBottom: 10 }} />
      <Text variant="bodyLarge" style={styles.infoText}>
        Connect to Google Classroom to import your assignments directly into
        AcadEase.
      </Text>
      <Button
        mode="contained"
        onPress={handleGoogleSignIn}
        style={styles.actionButton}
        icon="google"
        disabled={uiState === UI_STATE.AUTHENTICATING || !configuredWebClientId}
        loading={uiState === UI_STATE.AUTHENTICATING}
      >
        {uiState === UI_STATE.AUTHENTICATING
          ? "Connecting..."
          : "Sign in with Google"}
      </Button>
      {!configuredWebClientId && (
        <Text
          style={{
            color: theme.colors.error,
            marginTop: 10,
            textAlign: "center",
          }}
        >
          Web Client ID is not configured. Please check app setup.
        </Text>
      )}
    </View>
  );

  const renderCourseSelectionScreenInternal = () => (
    <>
      <View style={styles.headerActions}>
        <Text variant="titleMedium" numberOfLines={1} ellipsizeMode="tail">
          Hello, {userInfo?.user?.givenName || userInfo?.user?.name || "User"}!
        </Text>
        <Button onPress={() => handleGoogleSignOut()} mode="text" compact>
          Sign Out
        </Button>
      </View>
      <Button
        onPress={fetchUserCoursesRevalidate}
        mode="outlined"
        style={styles.refreshButton}
        icon="refresh"
        disabled={uiState === UI_STATE.FETCHING_COURSES}
        loading={uiState === UI_STATE.FETCHING_COURSES}
      >
        {uiState === UI_STATE.FETCHING_COURSES
          ? "Refreshing..."
          : "Refresh Courses"}
      </Button>
      {courses.length === 0 &&
        !errorMessage &&
        uiState !== UI_STATE.FETCHING_COURSES && (
          <Text style={styles.infoText}>
            No active courses found or yet to load. Try refreshing.
          </Text>
        )}
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={
              item.section ||
              item.descriptionHeading ||
              `Course ID: ${item.id.substring(0, 10)}...`
            }
            left={(props) => <List.Icon {...props} icon="google-classroom" />}
            onPress={() => handleSelectCourse(item)}
            titleNumberOfLines={2}
          />
        )}
        ItemSeparatorComponent={Divider}
        style={styles.listStyle}
      />
    </>
  );

  const renderAssignmentSelectionScreenInternal = () => (
    <>
      <View style={styles.headerActions}>
        <Button
          onPress={() => {
            setUiState(UI_STATE.SHOW_COURSES);
            setSelectedCourse(null);
            setAssignments([]);
          }}
          mode="text"
          icon="arrow-left"
          compact
        >
          Courses
        </Button>
        <Text
          variant="titleSmall"
          style={styles.headerTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {selectedCourse?.name || "Assignments"}
        </Text>
        <Button
          onPress={() =>
            fetchAssignmentsForCourseRevalidate(selectedCourse?.id)
          }
          mode="text"
          compact
          disabled={
            !selectedCourse || uiState === UI_STATE.FETCHING_ASSIGNMENTS
          }
        >
          {uiState === UI_STATE.FETCHING_ASSIGNMENTS ? "..." : "Refresh"}
        </Button>
      </View>
      {assignments.length === 0 &&
        !errorMessage &&
        uiState !== UI_STATE.FETCHING_ASSIGNMENTS && (
          <Text style={styles.infoText}>
            No assignments found in this course or yet to load. Try refreshing.
          </Text>
        )}
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.originalId}
        renderItem={({ item }) => (
          <List.Item
            title={item.title}
            description={
              item.deadline
                ? `Due: ${new Date(item.deadline).toLocaleDateString()}`
                : "No due date"
            }
            titleNumberOfLines={2}
            left={() => (
              <Checkbox
                status={
                  selectedAssignmentsForImport[item.originalId]
                    ? "checked"
                    : "unchecked"
                }
                onPress={() => toggleAssignmentSelection(item.originalId)}
              />
            )}
            onPress={() => toggleAssignmentSelection(item.originalId)}
          />
        )}
        ItemSeparatorComponent={Divider}
        style={styles.listStyle}
      />
      <Button
        mode="contained"
        onPress={handleImportTasks}
        style={styles.actionButton}
        disabled={Object.values(selectedAssignmentsForImport).every(
          (val) => !val
        )}
      >
        Import (
        {Object.values(selectedAssignmentsForImport).filter(Boolean).length})
        Selected
      </Button>
    </>
  );

  const renderLoadingInternal = (message = "Loading...") => (
    <View style={styles.centeredContent}>
      <ActivityIndicator
        animating={true}
        size="large"
        color={theme.colors.primary}
      />
      <Text
        style={[
          styles.infoText,
          { marginTop: 10, color: theme.colors.onSurfaceVariant },
        ]}
      >
        {message}
      </Text>
    </View>
  );

  const renderErrorScreenInternal = () => (
    <View style={styles.centeredContent}>
      <List.Icon
        icon="alert-circle-outline"
        color={theme.colors.error}
        size={48}
      />
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.error, marginTop: 10, marginBottom: 5 }}
      >
        Oops! Something went wrong.
      </Text>
      <ScrollView style={{ maxHeight: 100, marginBottom: 10 }}>
        <Text style={styles.infoText}>
          {errorMessage || "An unknown error occurred."}
        </Text>
      </ScrollView>
      <Button
        mode="contained"
        onPress={() => {
          if (userInfo && accessToken) {
            setUiState(UI_STATE.FETCHING_COURSES);
            fetchUserCoursesRevalidate();
          } else {
            setUiState(UI_STATE.NEEDS_AUTH);
          }
          setErrorMessage("");
        }}
        style={styles.actionButton}
      >
        Try Again
      </Button>
      <Button
        onPress={() => handleGoogleSignOut(true)}
        mode="text"
        style={{ marginTop: 10 }}
      >
        Start Over / Sign Out
      </Button>
    </View>
  );

  let content;
  switch (uiState) {
    case UI_STATE.NEEDS_AUTH:
      content = renderAuthScreen();
      break;
    case UI_STATE.AUTHENTICATING:
      content = renderLoadingInternal("Connecting to Google...");
      break;
    case UI_STATE.FETCHING_COURSES:
      content = renderLoadingInternal("Fetching your courses...");
      break;
    case UI_STATE.SHOW_COURSES:
      content = renderCourseSelectionScreenInternal();
      break;
    case UI_STATE.FETCHING_ASSIGNMENTS:
      content = renderLoadingInternal(
        `Workspaceing assignments for ${selectedCourse?.name || "course"}...`
      );
      break;
    case UI_STATE.SHOW_ASSIGNMENTS:
      content = renderAssignmentSelectionScreenInternal();
      break;
    case UI_STATE.ERROR:
      content = renderErrorScreenInternal();
      break;
    default:
      content = <Text>Unknown UI state: {uiState}</Text>;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text variant="headlineSmall" style={styles.title}>
            Import from Google Classroom
          </Text>
        </View>
        <View style={styles.modalContentContainer}>{content}</View>
        {uiState !== UI_STATE.AUTHENTICATING &&
          uiState !== UI_STATE.FETCHING_COURSES &&
          uiState !== UI_STATE.FETCHING_ASSIGNMENTS && (
            <Button onPress={onDismiss} style={styles.cancelButtonGlobal}>
              {uiState === UI_STATE.NEEDS_AUTH || uiState === UI_STATE.ERROR
                ? "Close Window"
                : "Cancel Import Process"}
            </Button>
          )}
        {/* Debug section - commented out
<Button
  mode="text"
  onPress={() => setShowDebug(!showDebug)}
  compact
  labelStyle={{ fontSize: 12 }}
  style={{ alignSelf: "center", marginTop: 10, paddingVertical: 0 }}
>
  {showDebug ? "Hide Debug Info" : "Show Debug Info"}
</Button>
{showDebug && (
  <Card style={styles.debugCard}>
    <Card.Content style={{ paddingVertical: 5 }}>
      <ScrollView style={styles.debugScroll}>
        {debugInfo.map((log, i) => (
          <Text key={i} style={styles.debugText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </Card.Content>
  </Card>
)}
*/}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    padding: 15,
    marginHorizontal: Platform.OS === "web" ? "15%" : 15,
    marginVertical: Platform.OS === "web" ? "5%" : 25,
    borderRadius: 12,
    maxHeight: "90%",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0", // Softer divider
    paddingBottom: 12,
    marginBottom: 12,
  },
  title: {
    textAlign: "center",
    fontWeight: "600", // Semibold
  },
  modalContentContainer: {
    // Added a container for better flex behavior of content
    flexGrow: 1,
    flexShrink: 1, // Allows content to shrink if modal is small
    minHeight: 250, // Ensure a decent minimum height for content
    justifyContent: "space-between", // Pushes action buttons towards bottom if content is short
  },
  centeredContent: {
    flex: 1, // Take available space
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  infoText: {
    marginVertical: 15,
    textAlign: "center",
    paddingHorizontal: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  actionButton: {
    marginTop: 20,
    paddingVertical: 6,
    width: "95%",
    alignSelf: "center",
    borderRadius: 8,
  },
  refreshButton: {
    marginHorizontal: 10,
    marginVertical: 8,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0", // Lighter border
    marginBottom: 8,
  },
  headerTitle: {
    // For course/assignment title in header
    flex: 1,
    textAlign: "center",
    marginHorizontal: 5,
    fontWeight: "500",
  },
  listStyle: {
    flexGrow: 1, // Allows list to take available space
    flexShrink: 1,
    maxHeight: Platform.OS === "ios" ? 320 : 350, // Adjust as needed
  },
  cancelButtonGlobal: {
    // For the main cancel/close button
    marginTop: 15,
    paddingVertical: 2,
  },
  debugCard: {
    marginTop: 10,
    borderColor: "#ddd",
    borderWidth: 1,
    maxHeight: 120, // Increased slightly
  },
  debugScroll: {
    maxHeight: 100,
  },
  debugText: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 3,
    color: "#444", // Darker debug text
  },
});

export default GoogleClassroomModal;
