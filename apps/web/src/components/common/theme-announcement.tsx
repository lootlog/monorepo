import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { SunDim, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { useTheme } from "@/hooks/context/use-theme";
import type { ThemeId } from "@/themes/catalog";

const ANNOUNCED_THEME: ThemeId = "muted";

const DISMISSED_STORAGE_KEY = `lootlog:theme-announcement:${ANNOUNCED_THEME}:dismissed`;

export const ThemeAnnouncement = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage(
    DISMISSED_STORAGE_KEY,
    false,
  );

  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const titleId = useId();

  if (isDismissed || theme === ANNOUNCED_THEME) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleSwitchTheme = () => {
    setTheme(ANNOUNCED_THEME);
    setIsDismissed(true);
  };

  // The theme class scopes the announced theme's tokens to the bar, so it
  // previews that theme whichever theme is active.
  return (
    <section
      aria-labelledby={titleId}
      className={`${ANNOUNCED_THEME} shrink-0 border-b border-border bg-card text-card-foreground`}
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
          >
            <SunDim className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
            <span id={titleId} className="font-semibold whitespace-nowrap">
              {t("settings.appearance.announcement.newTheme", {
                title: t(`settings.appearance.themes.${ANNOUNCED_THEME}.title`),
              })}
            </span>
            <span className="truncate text-muted-foreground">
              {t("settings.appearance.announcement.description")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={handleSwitchTheme}>
            {t("settings.appearance.announcement.tryIt")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("settings.appearance.announcement.dismiss")}
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};
