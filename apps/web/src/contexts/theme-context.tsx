import {
  createContext,
  useEffect,
  useLayoutEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useSession } from "@/hooks/auth/use-session";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  useSetUsersControllerGetUserPreferencesQueryData,
  useUsersControllerGetUserPreferences,
  useUsersControllerUpdateUserPreferences,
} from "@/lib/api/generated/main/users/users";
import {
  applyThemeClassToRoot,
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME_ID,
  getRootResolvedTheme,
  resolveThemeClass,
  THEME_STORAGE_KEY,
  type ColorMode,
  type ResolvedThemeId,
  type ThemeId,
} from "@/themes";

interface ThemeContextType {
  theme: ThemeId;
  resolvedTheme: ResolvedThemeId;
  colorMode: ColorMode;
  setTheme: (theme: ThemeId) => void;
  setColorMode: (mode: ColorMode) => void;
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
    const savedTheme = localStorage.getItem(
      THEME_STORAGE_KEY,
    ) as ThemeId | null;
    return savedTheme ?? DEFAULT_THEME_ID;
  });
  const [localColorMode, setLocalColorMode] = useState<ColorMode>(() => {
    const savedColorMode = localStorage.getItem(
      COLOR_MODE_STORAGE_KEY,
    ) as ColorMode | null;
    return savedColorMode ?? DEFAULT_COLOR_MODE;
  });
  const [hasThemeOverride, setHasThemeOverride] = useState(false);
  const [hasColorModeOverride, setHasColorModeOverride] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeId>(() =>
    resolveThemeClass(
      localTheme,
      getRootResolvedTheme(document.documentElement),
    ),
  );

  const theme =
    !isLoading && preferences?.theme && !hasThemeOverride
      ? (preferences.theme as ThemeId)
      : localTheme;
  const colorMode =
    !isLoading && preferences?.colorMode && !hasColorModeOverride
      ? (preferences.colorMode as ColorMode)
      : localColorMode;

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

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
      colorMode,
      resolvedTheme,
    });
  }, [colorMode, resolvedTheme]);

  const setTheme = (newTheme: ThemeId) => {
    setHasThemeOverride(true);
    setLocalTheme(newTheme);
    updatePreferences.mutate({ data: { theme: newTheme } });
  };

  const setColorMode = (newMode: ColorMode) => {
    setHasColorModeOverride(true);
    setLocalColorMode(newMode);
    updatePreferences.mutate({ data: { colorMode: newMode } });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        colorMode,
        setTheme,
        setColorMode,
        isLoading,
      }}
    >
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
        forcedTheme={colorMode}
      >
        {children}
      </NextThemesProvider>
    </ThemeContext.Provider>
  );
};
