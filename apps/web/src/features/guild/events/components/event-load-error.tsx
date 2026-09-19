import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

type EventLoadErrorProps = {
  guildId: string;
  eventId?: string;
};

export const EventLoadError = ({ guildId, eventId }: EventLoadErrorProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 max-h-full overflow-y-auto [justify-content:safe_center]">
      <AlertCircle className="size-12 text-destructive" />
      <p className="text-muted-foreground">{t("events.error")}</p>
      {eventId ? (
        <Link to="/$guildId/events/$eventId" params={{ guildId, eventId }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      ) : (
        <Link to="/$guildId/events" params={{ guildId }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      )}
    </div>
  );
};
