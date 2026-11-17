import { useEffect, useLayoutEffect, useState } from "react";
import type { CustomThemeDefinition } from "@lootlog/schema/custom-theme";
import {
  DEFAULT_THEME_ID,
  type ResolvedThemeId,
  type ThemeId,
} from "./catalog";
import {
  findSelectedCustomTheme,
  readCustomThemeId,
  type AppliedCustomTheme,
} from "./custom-theme";
import {
  applyThemeToDocument,
  getRootResolvedTheme,
  resolveSelectionTheme,
  resolveThemeClass,
  type ThemeSelection,
} from "./resolver";

/** What a selection paints with, given what is known about custom themes. */
export type ThemeLook = {
  customThemeId: string | null;
  customTheme: AppliedCustomTheme | null;
  definition: CustomThemeDefinition | null;
  theme: ThemeId;
};

/**
 * Resolves a selection to its look: the User's themes once they load, until
 * then the first cached copy of the selected custom theme, and a preview over
 * both.
 */
export const resolveThemeLook = ({
  selection,
  userThemes,
  cachedCustomThemes,
  preview = null,
}: {
  selection: ThemeSelection;
  userThemes: readonly AppliedCustomTheme[] | undefined;
  cachedCustomThemes: readonly (AppliedCustomTheme | null)[];
  preview?: CustomThemeDefinition | null;
}): ThemeLook => {
  const customThemeId = readCustomThemeId(selection);

  const customTheme = findSelectedCustomTheme(
    customThemeId,
    userThemes ?? cachedCustomThemes.filter((theme) => theme !== null),
  );

  const definition = preview ?? customTheme?.definition ?? null;

  return {
    customThemeId,
    customTheme,
    definition,
    theme: resolveSelectionTheme(selection, definition),
  };
};

/** Where a surface remembers the applied theme for its next start. */
export type ThemePersistence = {
  writeSelection: (selection: ThemeSelection) => void;
  writeCustomTheme: (theme: AppliedCustomTheme | null) => void;
};

/**
 * Applies a look to the document root and persists it. Returns the applied
 * class, a concrete cat for the cat roulette.
 */
export const useThemeSync = ({
  selection,
  look,
  userThemes,
  persistence,
}: {
  selection: ThemeSelection;
  look: ThemeLook;
  userThemes: readonly AppliedCustomTheme[] | undefined;
  persistence: ThemePersistence;
}): ResolvedThemeId => {
  const { customThemeId, customTheme, definition, theme } = look;

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeId>(() =>
    resolveThemeClass(
      DEFAULT_THEME_ID,
      typeof document === "undefined"
        ? null
        : getRootResolvedTheme(document.documentElement),
    ),
  );

  // The root keeps the applied class, so a cat roulette keeps its cat.
  useLayoutEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- the class is applied to the document root, and the cat roulette picks its cat there.
    setResolvedTheme(
      applyThemeToDocument({
        root: document.documentElement,
        theme,
        definition,
      }),
    );
  }, [theme, definition]);

  useEffect(() => {
    persistence.writeSelection(selection);
  }, [persistence, selection]);

  useEffect(() => {
    // Without the list and a copy, keep the stored copy; otherwise it follows
    // what the page shows.
    if (customThemeId === null || userThemes || customTheme) {
      persistence.writeCustomTheme(customTheme);
    }
  }, [persistence, customThemeId, customTheme, userThemes]);

  return resolvedTheme;
};
