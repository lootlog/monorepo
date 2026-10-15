import type { ThemeContextType } from "@/contexts/theme-context";

/** The default theme, with no custom theme or preview, for rendering in tests. */
export const TEST_THEME_CONTEXT: ThemeContextType = {
  theme: "default",
  resolvedTheme: "default",
  selection: "default",
  customTheme: null,
  setTheme: () => {},
  setPreview: () => {},
  isLoading: false,
};
