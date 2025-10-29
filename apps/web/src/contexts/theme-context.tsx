import {
  createContext,
  useEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useUserPreferences } from "@/hooks/api/user/use-user-preferences";
import { useUpdateUserPreferences } from "@/hooks/api/user/use-update-user-preferences";

type Theme =
  | "default"
  | "cyberpunk"
  | "pastel"
  | "fantasy"
  | "shonen"
  | "onepiece"
  | "anime"
  | "waguri"
  | "goth"
  | "halloween"
  | "realmadrid"
  | "realmadrid-3rd"
  | "barcelona";
type ColorMode = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  colorMode: ColorMode;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

const THEME_STORAGE_KEY = "lootlog-theme";
const COLOR_MODE_STORAGE_KEY = "lootlog-color-mode";

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return savedTheme || "default";
  });
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const savedColorMode = localStorage.getItem(
      COLOR_MODE_STORAGE_KEY,
    ) as ColorMode;
    return savedColorMode || "dark";
  });
  const [isUserInitiated, setIsUserInitiated] = useState(false);

  useEffect(() => {
    if (!isLoading && preferences?.theme && !isUserInitiated) {
      const localTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (localTheme !== preferences.theme) {
        setThemeState(preferences.theme as Theme);
        localStorage.setItem(THEME_STORAGE_KEY, preferences.theme);
      }
    }
    if (isUserInitiated) {
      setIsUserInitiated(false);
    }
  }, [preferences?.theme, isLoading, isUserInitiated]);

  useEffect(() => {
    if (!isLoading && preferences?.colorMode && !isUserInitiated) {
      const localColorMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
      if (localColorMode !== preferences.colorMode) {
        setColorModeState(preferences.colorMode as ColorMode);
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, preferences.colorMode);
      }
    }
  }, [preferences?.colorMode, isLoading, isUserInitiated]);

  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;

    root.classList.remove(
      "light",
      "dark",
      "default",
      "cyberpunk",
      "pastel",
      "fantasy",
      "shonen",
      "onepiece",
      "anime",
      "waguri",
      "goth",
      "halloween",
      "realmadrid",
      "realmadrid-3rd",
      "barcelona",
    );

    root.classList.add(colorMode);
    if (theme !== "default") {
      root.classList.add(theme);
    }
  }, [theme, colorMode, isLoading]);

  const setTheme = (newTheme: Theme) => {
    setIsUserInitiated(true);
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    updatePreferences.mutate({ theme: newTheme });
  };

  const setColorMode = (newMode: ColorMode) => {
    setIsUserInitiated(true);
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
