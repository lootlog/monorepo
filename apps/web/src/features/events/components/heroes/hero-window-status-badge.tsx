import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import {
  useHeroRespawnConfig,
  type WindowStatus,
} from "../../hooks/queries/use-hero-respawn-config";

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
  heroNpcId?: number | null;
  heroName?: string;
}

export const HeroWindowStatusBadge = ({
  eventId,
  heroNpcId,
  heroName,
}: HeroWindowStatusBadgeProps) => {
  const { t } = useTranslation();
  const respawnConfig = useHeroRespawnConfig({
    eventId,
    heroNpcId,
    heroName,
  });

  if (respawnConfig.windowStatus === "NONE") {
    return null;
  }

  const config = getWindowStatusConfig(respawnConfig.windowStatus, t);

  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
};
