export const colors = {
  // Backgrounds — warmer and lighter
  bg: "#2A2118",            // warm dark brown
  bgCard: "#362D24",        // warm brown card
  bgCardHover: "#3F3529",
  bgElevated: "#4A3F33",    // warm elevated
  bgInput: "#2A2118",
  bgOverlay: "rgba(42, 33, 24, 0.85)",

  // Text — warm whites
  text: "#FFF8F0",          // warm white
  textSecondary: "#C4B5A5", // warm tan
  textMuted: "#8C7D6D",     // warm gray
  textDim: "#6B5D4F",       // muted brown

  // Accents
  amber: "#F5A623",         // golden amber
  amberLight: "#FFD07A",    // light gold
  amberDark: "#D4891A",     // deep amber
  amberSubtle: "rgba(245, 166, 35, 0.15)",

  // Category colors
  pull: "#7CB8E0",          // soft blue for pulls
  pullSubtle: "rgba(124, 184, 224, 0.12)",

  // Status
  green: "#5EBB7A",         // softer green
  greenSubtle: "rgba(94, 187, 122, 0.15)",
  red: "#E06B6B",           // softer red
  redSubtle: "rgba(224, 107, 107, 0.12)",

  // Borders
  border: "#4A3F33",
  borderLight: "#5A4D3F",

  // Specific
  tabBar: "#241C14",
  tabActive: "#F5A623",
  tabInactive: "#8C7D6D",
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
  caption: 12,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  title: 22,
  heading: 28,
  hero: 34,
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

// Pull exercises (back work) — shown as their own category
export const PULL_EXERCISES = new Set([
  "Barbell rows",
  "DB rows",
  "Chest supported rows",
  "Pull-ups",
  "Chin-ups",
  "KB Clean",
  "Pull-downs",
  "Low Row",
]);
