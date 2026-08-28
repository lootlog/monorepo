import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card, CardContent } from "@lootlog/ui/components/card";
import { Bell, CalendarDays, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const RESERVATION_KEYS = ["first", "second", "third"] as const;

export const ThemePreviewReservationsCard = () => {
  const { t } = useTranslation();

  return (
    <Card className="gap-0 py-0">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" />
          <span className="truncate">
            {t("settings.appearance.preview.dashboard.reservations.title")}
          </span>
        </h2>
        <Button type="button" size="sm" variant="ghost" className="h-8">
          {t("settings.appearance.preview.dashboard.reservations.showAll")}
          <ChevronRight className="size-3.5" />
        </Button>
      </header>
      <CardContent className="p-0">
        <ul>
          {RESERVATION_KEYS.map((reservation) => (
            <li
              key={reservation}
              className="group flex min-w-0 items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-surface-hover"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold group-hover:text-primary">
                    {t(
                      `settings.appearance.preview.dashboard.reservations.${reservation}.name`,
                    )}
                  </span>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {t(
                      `settings.appearance.preview.dashboard.reservations.${reservation}.organization`,
                    )}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {t(
                      `settings.appearance.preview.dashboard.reservations.${reservation}.time`,
                    )}
                  </span>
                  {reservation === "first" ? (
                    <Badge
                      variant="secondary"
                      className="h-5 gap-1 text-[10px]"
                    >
                      <Bell className="size-3" />
                      {t(
                        "settings.appearance.preview.dashboard.reservations.reminder",
                      )}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
