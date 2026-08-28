import { useThemeMeta } from "./use-theme-meta";

export const useThemedKey = () => {
  const { isCatTheme, isRukiaTheme, isRiasTheme } = useThemeMeta();

  return (base: string) => {
    if (isCatTheme) return `${base}Cat`;
    if (isRukiaTheme) return `${base}Rukia`;
    if (isRiasTheme) return `${base}Rias`;
    return base;
  };
};
