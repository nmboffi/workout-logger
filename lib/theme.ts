export const colors = {
  // Light warm backgrounds
  bg: "#FAF7F4",            // warm off-white
  bgCard: "#FFFFFF",        // white cards
  bgCardHover: "#F5F1EC",
  bgElevated: "#F0EBE4",    // warm light gray
  bgInput: "#F5F1EC",
  bgOverlay: "rgba(250, 247, 244, 0.9)",

  // Text — dark warm tones
  text: "#2C2420",          // warm near-black
  textSecondary: "#6B5D52", // warm brown
  textMuted: "#9B8E82",     // warm gray
  textDim: "#BDB2A6",       // light warm gray

  // Accents
  amber: "#C4873B",         // muted golden
  amberLight: "#E0A85C",
  amberDark: "#A06E2E",
  amberSubtle: "rgba(196, 135, 59, 0.10)",

  // Category colors (muted for light theme)
  pull: "#5A8FA8",          // muted teal-blue
  pullSubtle: "rgba(90, 143, 168, 0.10)",

  // Status
  green: "#4A9960",         // muted green
  greenSubtle: "rgba(74, 153, 96, 0.10)",
  red: "#C45454",           // muted red
  redSubtle: "rgba(196, 84, 84, 0.08)",

  // Borders
  border: "#E8E2DA",
  borderLight: "#DDD6CC",

  // Specific
  tabBar: "#FFFFFF",
  tabActive: "#C4873B",
  tabInactive: "#9B8E82",
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
    shadowColor: "#8B7D6E",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: "#8B7D6E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
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

// Main lifts set
export const MAIN_LIFTS = new Set([
  "Bulgarian Split Squat",
  "Bench Press",
  "Trap Bar Deadlift",
  "Overhead Press",
]);

// Movement category labels + colors for main/aux lifts
export const EXERCISE_CATEGORIES: Record<string, { label: string; color: string }> = {
  // Mains
  "Bulgarian Split Squat": { label: "Squat", color: "#C17A4A" },
  "Bench Press":           { label: "Bench", color: "#B8893D" },
  "Trap Bar Deadlift":     { label: "Dead",  color: "#A07040" },
  "Overhead Press":        { label: "OHP",   color: "#9A944A" },
  // Squat auxiliaries
  "Reverse Twisting Lunge": { label: "Squat", color: "#C17A4A" },
  "Leg Press":              { label: "Squat", color: "#C17A4A" },
  // Bench auxiliaries
  "Incline Press":     { label: "Bench", color: "#B8893D" },
  "DB Incline Press":  { label: "Bench", color: "#B8893D" },
  // Deadlift auxiliaries
  "DB RDL": { label: "Dead", color: "#A07040" },
  // OHP auxiliaries
  "Seated OHP": { label: "OHP", color: "#9A944A" },
};
