import type { CSSProperties } from "react";
import {
  createDefinitionFromBase,
  customThemeStyle,
} from "@lootlog/ui/themes/custom-theme";
import {
  resolveSelectionTheme,
  resolveStoredSelection,
  resolveThemeClass,
} from "@lootlog/ui/themes/resolver";

/**
 * The root's class and style for a stored built-in theme, so the server
 * renders the page in it. A custom theme renders as the default until the
 * browser applies its cached copy.
 */
export const getDocumentTheme = (storedSelection: string | null) => {
  const theme = resolveSelectionTheme(
    resolveStoredSelection(storedSelection),
    null,
  );

  const style: CSSProperties = {
    colorScheme: "dark",
    ...customThemeStyle(createDefinitionFromBase(theme)),
  };

  return { className: `dark ${resolveThemeClass(theme)}`, style };
};
