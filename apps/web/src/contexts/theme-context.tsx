import { createContext } from "react";
import type { ThemeId, ResolvedThemeId } from "@/themes";

export interface ThemeContextType {
  theme: ThemeId;
  resolvedTheme: ResolvedThemeId;
  setTheme: (theme: ThemeId) => void;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);
