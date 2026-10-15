import { createContext } from "react";
import type { CustomThemeDefinition } from "@lootlog/schema/custom-theme";
import type { ThemeId, ResolvedThemeId } from "@/themes";
import type { AppliedCustomTheme } from "@/themes/custom-theme";
import type { ThemeSelection } from "@/themes/resolver";

export interface ThemeContextType {
  /** The built-in theme in effect: the pick itself or a custom theme's base. */
  theme: ThemeId;
  resolvedTheme: ResolvedThemeId;
  /** What the User picked, a built-in theme or `custom:<id>`. */
  selection: ThemeSelection;
  /** The picked custom theme, once its definition is known. */
  customTheme: AppliedCustomTheme | null;
  setTheme: (selection: ThemeSelection) => void;
  /**
   * Shows a definition across the app without saving it, as the editor's
   * live preview; `null` returns to the saved pick.
   */
  setPreview: (definition: CustomThemeDefinition | null) => void;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);
