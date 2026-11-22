import { createContext } from "react";
import type { CustomThemeDefinition } from "@lootlog/schema/custom-theme";
import type { ThemeId, ResolvedThemeId } from "@lootlog/ui/themes/catalog";
import type { AppliedCustomTheme } from "@lootlog/ui/themes/custom-theme";
import type { ThemeSelection } from "@lootlog/ui/themes/resolver";

export interface ThemeContextType {
  theme: ThemeId;
  resolvedTheme: ResolvedThemeId;
  selection: ThemeSelection;
  customTheme: AppliedCustomTheme | null;
  setTheme: (selection: ThemeSelection) => void;
  setPreview: (definition: CustomThemeDefinition | null) => void;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);
