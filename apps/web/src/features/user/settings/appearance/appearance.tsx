import { useEffect, useEffectEvent, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useSearch } from "@tanstack/react-router";
import { useTheme } from "@/hooks/context/use-theme";
import { ThemeCard } from "@lootlog/ui/components/theme-card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { THEME_CATALOG } from "@/themes/catalog";
import { isThemeId } from "@/themes/resolver";

export const AppearanceSettings: FC = () => {
  const { theme, setTheme } = useTheme();
  const { theme: themeParam } = useSearch({
    from: "/_authenticated/@me/settings/appearance",
  });

  const applyThemeParam = useEffectEvent(() => {
    if (themeParam && isThemeId(themeParam) && themeParam !== theme) {
      setTheme(themeParam);
    }
  });
  useEffect(() => {
    applyThemeParam();
  }, [themeParam]);
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full">
      <div className="px-3 pb-3 flex flex-col gap-4">
        <h1 className="sr-only">{t("settings.appearance.title")}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {THEME_CATALOG.map((themeOption) => (
            <ThemeCard
              key={themeOption.name}
              name={themeOption.name}
              title={t(`settings.appearance.themes.${themeOption.name}.title`)}
              description={t(
                `settings.appearance.themes.${themeOption.name}.description`,
              )}
              colors={themeOption.colors}
              backgroundImage={themeOption.backgroundImage}
              isActive={theme === themeOption.name}
              onClick={() => setTheme(themeOption.name)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
