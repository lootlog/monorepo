import { createContext, useEffect, useState, FC, ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useUserPreferences } from "@/hooks/api/user/use-user-preferences";
import { useUpdateUserPreferences } from "@/hooks/api/user/use-update-user-preferences";

type Theme = "default" | "cyberpunk" | "pastel" | "fantasy" | "shonen" | "onepiece" | "anime" | "goth" | "halloween" | "realmadrid" | "realmadrid-3rd" | "barcelona";
type ColorMode = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  colorMode: ColorMode;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "lootlog-theme";
const COLOR_MODE_STORAGE_KEY = "lootlog-color-mode";

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return savedTheme || "default";
  });
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const savedColorMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode;
    return savedColorMode || "dark";
  });

  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  useEffect(() => {
    if (preferences?.theme) {
      setThemeState(preferences.theme as Theme);
      localStorage.setItem(THEME_STORAGE_KEY, preferences.theme);
    }
    if (preferences?.colorMode) {
      setColorModeState(preferences.colorMode as ColorMode);
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, preferences.colorMode);
    }
  }, [preferences]);

  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;

    root.classList.remove("light", "dark", "default", "cyberpunk", "pastel", "fantasy", "shonen", "onepiece", "anime", "goth", "halloween", "realmadrid", "realmadrid-3rd", "barcelona");

    root.classList.add(colorMode);
    if (theme !== "default") {
      root.classList.add(theme);
    }
  }, [theme, colorMode, isLoading]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    updatePreferences.mutate({ theme: newTheme });
  };

  const setColorMode = (newMode: ColorMode) => {
    setColorModeState(newMode);
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, newMode);
    updatePreferences.mutate({ colorMode: newMode });
  };

  return (
    <ThemeContext.Provider
      value={{ theme, colorMode, setTheme, setColorMode, isLoading }}
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
