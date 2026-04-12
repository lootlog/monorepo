import { useTheme } from "@/hooks/context/use-theme";
import {
  getThemeFamily,
  getThemeGreetingSuffix,
  isCatTheme,
  isRukiaTheme,
} from "./resolver";

export const useThemeMeta = () => {
  const themeState = useTheme();
  const { theme, resolvedTheme } = themeState;

  return {
    ...themeState,
    family: getThemeFamily(theme),
    resolvedFamily: getThemeFamily(resolvedTheme),
    isCatTheme: isCatTheme(theme),
    isRukiaTheme: isRukiaTheme(theme),
    greetingSuffix: getThemeGreetingSuffix(theme),
  };
};
