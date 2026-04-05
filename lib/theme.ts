export const colors = {
  // Backgrounds
  bg: "#1C1917",          // stone-900
  bgCard: "#292524",      // stone-800
  bgCardHover: "#322F2C",
  bgElevated: "#44403C",  // stone-700
  bgInput: "#1C1917",
  bgOverlay: "rgba(28, 25, 23, 0.85)",

  // Text
  text: "#FAFAF9",        // stone-50
  textSecondary: "#A8A29E", // stone-400
  textMuted: "#78716C",   // stone-500
  textDim: "#57534E",     // stone-600

  // Accents
  amber: "#F59E0B",       // amber-500
  amberLight: "#FCD34D",  // amber-300
  amberDark: "#D97706",   // amber-600
  amberSubtle: "rgba(245, 158, 11, 0.12)",

  // Status
  green: "#22C55E",       // green-500
  greenSubtle: "rgba(34, 197, 94, 0.12)",
  red: "#EF4444",         // red-500
  redSubtle: "rgba(239, 68, 68, 0.10)",

  // Borders
  border: "#3D3835",
  borderLight: "#44403C",

  // Specific
  tabBar: "#1C1917",
  tabActive: "#F59E0B",
  tabInactive: "#78716C",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const font = {
  // Sizes
  caption: 12,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  title: 22,
  heading: 28,
  hero: 34,

  // Weights
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  heavy: "800" as const,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
