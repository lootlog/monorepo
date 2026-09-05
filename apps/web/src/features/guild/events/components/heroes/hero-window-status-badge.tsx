import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "cn";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useEventsMonitoringControllerGetHeroRespawnConfig } from "@lootlog/client/main";
import { getWindowStatusConfig } from "../../utils/window-status-presentation";

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

  const config = getWindowStatusConfig(respawnConfig.windowStatus, (key) =>
    t(
      key,
      {
        "events.respawn.status.open": "Okno otwarte",
        "events.respawn.status.waiting": "Oczekiwanie",
        "events.respawn.status.overdue": "Poszukiwanie",
        "events.respawn.status.none": "Brak okna",
      }[key] ?? key,
    ),
  );

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
