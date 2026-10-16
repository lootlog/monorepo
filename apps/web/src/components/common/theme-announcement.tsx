import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { Palette, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { ROUTES } from "@/config/routes";

const DISMISSED_STORAGE_KEY =
  "lootlog:theme-announcement:custom-themes:dismissed";

export const ThemeAnnouncement = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage(
    DISMISSED_STORAGE_KEY,
    false,
  );

  const { t } = useTranslation();
  const titleId = useId();

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="shrink-0 border-b border-border bg-card text-card-foreground"
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
          >
            <Palette className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
            <span id={titleId} className="font-semibold whitespace-nowrap">
              {t("settings.appearance.announcement.title")}
            </span>
            <span className="truncate text-muted-foreground">
              {t("settings.appearance.announcement.description")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            render={<Link to={ROUTES.user.settings.newTheme} />}
            onClick={handleDismiss}
          >
            {t("settings.appearance.announcement.create")}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("settings.appearance.announcement.dismiss")}
            className="text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};
