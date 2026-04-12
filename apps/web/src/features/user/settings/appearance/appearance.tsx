import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Palette } from "lucide-react";
import { useTheme } from "@/hooks/context/use-theme";
import { ThemeCard } from "@lootlog/ui/components/theme-card";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { THEME_CATALOG } from "@/themes";

export const AppearanceSettings: FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full">
      <div className="px-3 pb-3 flex flex-col gap-4">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
              <Palette className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                {t("settings.appearance.title")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {t("settings.appearance.description")}
              </p>
            </div>
          </div>
        </Card>

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
              onClick={() => setTheme(themeOption.name as typeof theme)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
