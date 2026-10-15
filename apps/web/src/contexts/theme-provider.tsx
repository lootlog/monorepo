/* eslint-disable react-doctor/jsx-no-constructed-context-values -- Vite React Compiler output caches this provider value and its callbacks by their actual dependencies; verified through the running Vite module transform. */
import { ThemeContext } from "./theme-context";
import {
  resolveStoredSelection,
  resolveStoredTheme,
  type ThemeSelection,
} from "@/themes/resolver";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useSession } from "@/hooks/auth/use-session";
import { useUpdateUserPreferences } from "@/hooks/api/user/use-user-preferences";
import { useUserThemes } from "@/hooks/api/user/use-user-themes";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
} from "@lootlog/client/main";
import type { CustomThemeDefinition } from "@lootlog/schema/custom-theme";
import {
  applyThemeClassToRoot,
  getRootResolvedTheme,
  resolveThemeClass,
  THEME_STORAGE_KEY,
  type ResolvedThemeId,
  type ThemeId,
} from "@/themes";
import { DEFAULT_THEME_ID } from "@/themes/catalog";
import {
  applyThemeToRoot,
  createDefinitionFromBase,
  readCachedCustomTheme,
  readCustomThemeId,
  writeCachedCustomTheme,
  type AppliedCustomTheme,
} from "@/themes/custom-theme";

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
        queryKey: getUsersControllerGetUserPreferencesQueryKey(),
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

  const customThemeId = readCustomThemeId(selection);

  const { data: userThemes } = useUserThemes({
    enabled: !!session?.user && customThemeId !== null,
  });

  const customTheme = ((): AppliedCustomTheme | null => {
    if (customThemeId === null) return null;

    if (userThemes) {
      const stored = userThemes.find(({ id }) => id === customThemeId);

      return stored ? { id: stored.id, definition: stored.definition } : null;
    }

    // Until the list loads, the last applied copy keeps the page as it was.
    const cached = readCachedCustomTheme();

    return cached?.id === customThemeId ? cached : null;
  })();

  const definition = preview ?? customTheme?.definition ?? null;

  const theme: ThemeId =
    definition?.baseThemeId ??
    (customThemeId === null ? resolveStoredTheme(selection) : DEFAULT_THEME_ID);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeId>(() =>
    resolveThemeClass(
      DEFAULT_THEME_ID,
      getRootResolvedTheme(document.documentElement),
    ),
  );

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, selection);
  }, [selection]);

  useEffect(() => {
    // Keep the cache while the list loads; once it has, it follows the pick.
    if (customThemeId === null || userThemes) {
      writeCachedCustomTheme(customTheme);
    }
  }, [customThemeId, customTheme, userThemes]);

  useLayoutEffect(() => {
    const root = document.documentElement;

    const nextResolvedTheme = resolveThemeClass(
      theme,
      getRootResolvedTheme(root) ?? resolvedTheme,
    );

    applyThemeClassToRoot({ root, resolvedTheme: nextResolvedTheme });
    applyThemeToRoot(root, definition ?? createDefinitionFromBase(theme));
    setResolvedTheme(nextResolvedTheme);
  }, [theme, definition, resolvedTheme]);

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
