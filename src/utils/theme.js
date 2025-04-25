import { MD3LightTheme, configureFonts } from "react-native-paper";

// Font configuration
const fontConfig = {
  displayLarge: {
    fontFamily: "System",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  displayMedium: {
    fontFamily: "System",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  displaySmall: {
    fontFamily: "System",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  headlineLarge: {
    fontFamily: "System",
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  headlineMedium: {
    fontFamily: "System",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  headlineSmall: {
    fontFamily: "System",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  titleLarge: {
    fontFamily: "System",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  titleMedium: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 0.15,
  },
  bodyMedium: {
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily: "System",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
};

// AcadEase theme
const AcadEaseTheme = {
  ...MD3LightTheme,

  // Customize your colors
  colors: {
    ...MD3LightTheme.colors,
    primary: "#033867", // Deep Teal - main brand color
    primaryContainer: "#E0F4F7", // Light teal for containers
    secondary: "#FF6B6B", // Bright Coral for accents/urgency indicators
    secondaryContainer: "#FFEDED", // Light coral container
    tertiary: "#C1E3D6", // Soft Mint for highlights
    tertiaryContainer: "#EAF7F1", // Light mint container
    surface: "#FFFFFF",
    surfaceVariant: "#F5F8FA",
    background: "#FCFDFD",
    error: "#D84315", // Darker orange-red for errors
    errorContainer: "#FFEEE9",
    onPrimary: "#FFFFFF",
    onPrimaryContainer: "#003A43",
    onSecondary: "#FFFFFF",
    onSecondaryContainer: "#4A0000",
    onTertiary: "#003828",
    onTertiaryContainer: "#001F17",
    onSurface: "#1C1B1F",
    onSurfaceVariant: "#4A5568", // Slate gray for text
    outline: "#DAE2E8",
    outlineVariant: "#C4CDD5",
    shadow: "rgba(0, 0, 0, 0.15)",
    scrim: "rgba(0, 0, 0, 0.3)",
    inverseSurface: "#2A3541",
    inverseOnSurface: "#F5F5F5",
    inversePrimary: "#88D1DC",
  },

  // Apply custom fonts
  fonts: configureFonts({ config: fontConfig }),

  // Customize roundness
  roundness: 10,

  // Animation
  animation: {
    scale: 1.0,
  },

  custom: {
    gradients: {
      primary: ["#1A7B88", "#259AAA"],
      secondary: ["#FF6B6B", "#FF8E8E"],
      tertiary: ["#C1E3D6", "#E0F0E9"],
      priority: {
        high: ["#FF6B6B", "#FF8E8E"],
        medium: ["#FFA41B", "#FFB74D"],
        low: ["#60CCD9", "#92E3DD"],
      },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    shadows: {
      small: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.16,
        shadowRadius: 1.0,
        elevation: 1,
      },
      medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 3.0,
        elevation: 3,
      },
      large: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5.0,
        elevation: 5,
      },
    },

    urgency: {
      high: "#FF6B6B",
      medium: "#FFA41B",
      low: "#60CCD9",
      completed: "#8FC99F",
    },
  },
};

export default AcadEaseTheme;
