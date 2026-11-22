import type { ThemeContextType } from "@/contexts/theme-context";

export const TEST_THEME_CONTEXT: ThemeContextType = {
  theme: "default",
  resolvedTheme: "default",
  selection: "default",
  customTheme: null,
  setTheme: () => {},
  setPreview: () => {},
  isLoading: false,
};
