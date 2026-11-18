/* eslint-disable react-doctor/jsx-no-constructed-context-values -- Vite React Compiler output caches this provider value and its callbacks by their actual dependencies; verified through the running Vite module transform. */
import { ThemeContext } from "./theme-context";
import { useState, type FC, type ReactNode } from "react";
import { useSession } from "@/hooks/auth/use-session";
import { useUpdateUserPreferences } from "@/hooks/api/user/use-user-preferences";
import { useUserThemes } from "@/hooks/api/user/use-user-themes";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/lib/toast";
import { useUsersControllerGetUserPreferences } from "@lootlog/client/main";
import type { CustomThemeDefinition } from "@lootlog/schema/custom-theme";
import {
  resolveStoredSelection,
  type ThemeSelection,
} from "@lootlog/ui/themes/resolver";
import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";
import {
  readCachedCustomTheme,
  readCustomThemeId,
  writeCachedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";
import {
  resolveThemeLook,
  useThemeSync,
  type ThemePersistence,
} from "@lootlog/ui/themes/theme-sync";

const localThemePersistence: ThemePersistence = {
  writeSelection: (selection) =>
    localStorage.setItem(THEME_STORAGE_KEY, selection),
  writeCustomTheme: writeCachedCustomTheme,
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const updatePreferences = useUpdateUserPreferences();

  const { data: preferences, isLoading } = useUsersControllerGetUserPreferences(
    {
      query: {
        enabled: !!session?.user,
        retry: 1,
      },
    },
  );

  const [localSelection, setLocalSelection] = useState<ThemeSelection>(() =>
    resolveStoredSelection(localStorage.getItem(THEME_STORAGE_KEY)),
  );

  const [hasThemeOverride, setHasThemeOverride] = useState(false);
  const [preview, setPreview] = useState<CustomThemeDefinition | null>(null);

  const selection =
    !isLoading && preferences?.theme && !hasThemeOverride
      ? resolveStoredSelection(preferences.theme)
      : localSelection;

  const { data: userThemes } = useUserThemes({
    enabled: !!session?.user && readCustomThemeId(selection) !== null,
  });

  const look = resolveThemeLook({
    selection,
    userThemes,
    cachedCustomThemes: [readCachedCustomTheme()],
    preview,
  });

  const { theme, customTheme } = look;

  const resolvedTheme = useThemeSync({
    selection,
    look,
    userThemes,
    persistence: localThemePersistence,
  });

  const setTheme = (nextSelection: ThemeSelection) => {
    setHasThemeOverride(true);
    setLocalSelection(nextSelection);
    updatePreferences.mutate(
      { theme: nextSelection },
      {
        onError: () => toast.error(t("settings.appearance.saveError")),
      },
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        selection,
        customTheme,
        setTheme,
        setPreview,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
