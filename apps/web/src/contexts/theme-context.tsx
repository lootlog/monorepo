import { resolveStoredTheme } from "@/themes/resolver";
import {
  createContext,
  useEffect,
  useLayoutEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useSession } from "@/hooks/auth/use-session";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useSetUsersControllerGetUserPreferencesQueryData,
  useUsersControllerGetUserPreferences,
  useUsersControllerUpdateUserPreferences,
} from "@lootlog/client/main";
import {
  applyThemeClassToRoot,
  getRootResolvedTheme,
  resolveThemeClass,
  THEME_STORAGE_KEY,
  type ResolvedThemeId,
  type ThemeId,
} from "@/themes";

interface ThemeContextType {
  theme: ThemeId;
  resolvedTheme: ResolvedThemeId;
  setTheme: (theme: ThemeId) => void;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const setUserPreferences = useSetUsersControllerGetUserPreferencesQueryData();
  const { data: preferences, isLoading } = useUsersControllerGetUserPreferences(
    {
      query: {
        enabled: !!session?.user,
        queryKey: getUsersControllerGetUserPreferencesQueryKey(),
        retry: 1,
      },
    },
  );
  const updatePreferences = useUsersControllerUpdateUserPreferences({
    mutation: {
      onSuccess: (updatedPreferences) => {
        setUserPreferences(updatedPreferences);
      },
    },
  });

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
    setResolvedTheme((currentResolvedTheme) =>
      resolveThemeClass(
        theme,
        getRootResolvedTheme(document.documentElement) ?? currentResolvedTheme,
      ),
    );
  }, [theme]);

  useLayoutEffect(() => {
    applyThemeClassToRoot({
      root: document.documentElement,
      resolvedTheme,
    });
  }, [resolvedTheme]);

  const setTheme = (newTheme: ThemeId) => {
    setHasThemeOverride(true);
    setLocalTheme(newTheme);
    updatePreferences.mutate({ data: { theme: newTheme } });
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
