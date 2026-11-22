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

export type ThemeLook = {
  customThemeId: string | null;
  customTheme: AppliedCustomTheme | null;
  definition: CustomThemeDefinition | null;
  theme: ThemeId;
};

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

export type ThemePersistence = {
  writeSelection: (selection: ThemeSelection) => void;
  writeCustomTheme: (theme: AppliedCustomTheme | null) => void;
};

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
    if (customThemeId === null || userThemes || customTheme) {
      persistence.writeCustomTheme(customTheme);
    }
  }, [persistence, customThemeId, customTheme, userThemes]);

  return resolvedTheme;
};
