import {
  createContext,
  useEffect,
  useLayoutEffect,
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
  | "barcelona"
  | "rukia";
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

  const [localTheme, setLocalTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return savedTheme || "default";
  });
  const [localColorMode, setLocalColorMode] = useState<ColorMode>(() => {
    const savedColorMode = localStorage.getItem(
      COLOR_MODE_STORAGE_KEY,
    ) as ColorMode;
    return savedColorMode || "dark";
  });
  const [hasThemeOverride, setHasThemeOverride] = useState(false);
  const [hasColorModeOverride, setHasColorModeOverride] = useState(false);

  const theme =
    !isLoading && preferences?.theme && !hasThemeOverride
      ? (preferences.theme as Theme)
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
      "rukia",
    );

    root.classList.add(colorMode);
    if (theme !== "default") {
      root.classList.add(theme);
    }
  }, [theme, colorMode]);

  const setTheme = (newTheme: Theme) => {
    setHasThemeOverride(true);
    setLocalTheme(newTheme);
    updatePreferences.mutate({ theme: newTheme });
  };

  const setColorMode = (newMode: ColorMode) => {
    setHasColorModeOverride(true);
    setLocalColorMode(newMode);
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
