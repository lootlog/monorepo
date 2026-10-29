/* eslint-disable react-doctor/jsx-no-constructed-context-values -- Vite React Compiler output caches this provider value and its callbacks by their actual dependencies; verified through the running Vite module transform. */
import { ThemeContext } from "./theme-context";
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
  applyThemeToDocument,
  getRootResolvedTheme,
  resolveSelectionTheme,
  resolveStoredSelection,
  resolveThemeClass,
  type ThemeSelection,
} from "@lootlog/ui/themes/resolver";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  type ResolvedThemeId,
} from "@lootlog/ui/themes/catalog";
import {
  findSelectedCustomTheme,
  readCustomThemeId,
  writeCachedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";

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

  const customTheme = findSelectedCustomTheme(customThemeId, userThemes);

  const definition = preview ?? customTheme?.definition ?? null;

  const theme = resolveSelectionTheme(selection, definition);

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

    setResolvedTheme(
      applyThemeToDocument({
        root,
        theme,
        definition,
        currentResolvedTheme: getRootResolvedTheme(root) ?? resolvedTheme,
      }),
    );
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
