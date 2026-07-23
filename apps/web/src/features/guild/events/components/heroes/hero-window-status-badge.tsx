import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useEventsMonitoringControllerGetHeroRespawnConfig } from "@lootlog/api-client/react-query/main/events";
import type { WindowStatus } from "../../types/api";

const getWindowStatusConfig = (
  status: WindowStatus,
  t: (key: string, fallback: string) => string,
) => {
  switch (status) {
    case "OPEN":
      return {
        label: t("events.respawn.status.open", "Okno otwarte"),
        className: "bg-green-500/10 text-green-500 border-green-500/20",
      };
    case "WAITING":
      return {
        label: t("events.respawn.status.waiting", "Oczekiwanie"),
        className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    case "OVERDUE":
      return {
        label: t("events.respawn.status.overdue", "Poszukiwanie"),
        className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      };
    case "NONE":
    default:
      return {
        label: t("events.respawn.status.none", "Brak okna"),
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};

interface HeroWindowStatusBadgeProps {
  eventId: string;
  heroId: string;
  className?: string;
}

export const HeroWindowStatusBadge = ({
  eventId,
  heroId,
  className,
}: HeroWindowStatusBadgeProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: queryData } = useEventsMonitoringControllerGetHeroRespawnConfig(
    {
      guildId: guildId ?? "",
      eventId,
      heroId,
    },
  );
  const respawnConfig = queryData ?? {
    hasTimer: false,
    windowStatus: "NONE" as const,
    minSpawnTime: null,
    maxSpawnTime: null,
    overdueMs: null,
  };

  if (respawnConfig.windowStatus === "NONE") {
    return null;
  }

  const config = getWindowStatusConfig(respawnConfig.windowStatus, t);

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] whitespace-nowrap",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
};
