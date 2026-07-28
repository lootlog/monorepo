import { CalendarClock } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { useTranslation } from "react-i18next";

export const ReservationsSettingsHeader = () => {
  const { t } = useTranslation();

  return (
    <Card className="mx-3 mt-3 gap-4 border-border bg-card p-4  shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <CalendarClock className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {t("settings.reservations.title")}
          </h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("settings.reservations.description")}
          </p>
        </div>
      </div>
    </Card>
  );
};
