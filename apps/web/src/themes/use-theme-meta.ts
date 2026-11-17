import { useTheme } from "@/hooks/context/use-theme";
import { getThemeFamily } from "@lootlog/ui/themes/resolver";

export const useThemeMeta = () => {
  const themeState = useTheme();
  const { theme, resolvedTheme } = themeState;

  return {
    ...themeState,
    family: getThemeFamily(theme),
    resolvedFamily: getThemeFamily(resolvedTheme),
  };
};
