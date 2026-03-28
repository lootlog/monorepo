import { useState, useEffect } from "react";
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

function formatNegativeElapsed(maxSpawnTime: string): string {
  const elapsed = Math.floor(
    (Date.now() - new Date(maxSpawnTime).getTime()) / 1000,
  );
  if (elapsed < 0) return "";

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `-${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `-${minutes}:${pad(seconds)}`;
}

interface HeroWindowStatusBadgeProps {
  eventId: string;
  heroNpcId?: number | null;
  heroName?: string;
  className?: string;
}

export const HeroWindowStatusBadge = ({
  eventId,
  heroNpcId,
  heroName,
  className,
}: HeroWindowStatusBadgeProps) => {
  const { t } = useTranslation();
  const respawnConfig = useHeroRespawnConfig({
    eventId,
    heroNpcId,
    heroName,
  });

  const isOverdue = respawnConfig.windowStatus === "OVERDUE";
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isOverdue) return;

    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isOverdue]);

  if (respawnConfig.windowStatus === "NONE") {
    return null;
  }

  const config = getWindowStatusConfig(respawnConfig.windowStatus, t);
  const overdueTime =
    isOverdue && respawnConfig.maxSpawnTime
      ? formatNegativeElapsed(respawnConfig.maxSpawnTime)
      : null;

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
      {overdueTime && <span className="ml-1 font-mono">{overdueTime}</span>}
    </Badge>
  );
};
