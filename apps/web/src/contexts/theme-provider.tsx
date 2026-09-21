/* eslint-disable react-doctor/jsx-no-constructed-context-values -- Vite React Compiler output caches this provider value and its callbacks by their actual dependencies; verified through the running Vite module transform. */
import { ThemeContext } from "./theme-context";
import { resolveStoredTheme } from "@/themes/resolver";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useSession } from "@/hooks/auth/use-session";
import { useUpdateUserPreferences } from "@/hooks/api/user/use-user-preferences";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
} from "@lootlog/client/main";
import {
  applyThemeClassToRoot,
  getRootResolvedTheme,
  resolveThemeClass,
  THEME_STORAGE_KEY,
  type ResolvedThemeId,
  type ThemeId,
} from "@/themes";

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

  const [localTheme, setLocalTheme] = useState<ThemeId>(() => {
    return resolveStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
  });

  const [hasThemeOverride, setHasThemeOverride] = useState(false);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeId>(() =>
    resolveThemeClass(
      localTheme,
      getRootResolvedTheme(document.documentElement),
    ),
  );

  const theme =
    !isLoading && preferences?.theme && !hasThemeOverride
      ? resolveStoredTheme(preferences.theme)
      : localTheme;

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useLayoutEffect(() => {
    const nextResolvedTheme = resolveThemeClass(
      theme,
      getRootResolvedTheme(document.documentElement) ?? resolvedTheme,
    );

    applyThemeClassToRoot({
      root: document.documentElement,
      resolvedTheme: nextResolvedTheme,
    });
    setResolvedTheme(nextResolvedTheme);
  }, [theme, resolvedTheme]);

  const setTheme = (newTheme: ThemeId) => {
    setHasThemeOverride(true);
    setLocalTheme(newTheme);
    updatePreferences.mutate(
      { theme: newTheme },
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
        setTheme,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
