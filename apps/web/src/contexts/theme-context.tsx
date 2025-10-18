import { createContext, useContext, useEffect, useState, FC, ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type Theme = "default" | "cyberpunk" | "pastel" | "fantasy" | "shonen" | "onepiece" | "anime";
type ColorMode = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  colorMode: ColorMode;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "lootlog-theme";
const COLOR_MODE_STORAGE_KEY = "lootlog-color-mode";

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("default");
  const [colorMode, setColorModeState] = useState<ColorMode>("dark");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch("/api/users/@me/preferences", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.theme) {
            setThemeState(data.theme as Theme);
            localStorage.setItem(THEME_STORAGE_KEY, data.theme);
          }
          if (data.colorMode) {
            setColorModeState(data.colorMode as ColorMode);
            localStorage.setItem(COLOR_MODE_STORAGE_KEY, data.colorMode);
          }
        } else {
          const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
          const savedColorMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode;

          if (savedTheme) setThemeState(savedTheme);
          if (savedColorMode) setColorModeState(savedColorMode);
        }
      } catch (error) {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
        const savedColorMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY) as ColorMode;

        if (savedTheme) setThemeState(savedTheme);
        if (savedColorMode) setColorModeState(savedColorMode);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;

    root.classList.remove("light", "dark", "default", "cyberpunk", "pastel", "fantasy", "shonen", "onepiece", "anime");

    root.classList.add(colorMode);
    if (theme !== "default") {
      root.classList.add(theme);
    }
  }, [theme, colorMode, isLoading]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);

    try {
      await fetch("/api/users/@me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (error) {
      console.error("Failed to sync theme preference:", error);
    }
  };

  const setColorMode = async (newMode: ColorMode) => {
    setColorModeState(newMode);
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, newMode);

    try {
      await fetch("/api/users/@me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ colorMode: newMode }),
      });
    } catch (error) {
      console.error("Failed to sync color mode preference:", error);
    }
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

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
