import { Badge, type BadgeProps } from "@lootlog/ui/components/badge";
import { useTranslation } from "react-i18next";
import type { HeroSightingStatus } from "./hero-sighting-status";

const STATUS_VARIANT = {
  ROAMING: "live",
  SPAWNING: "timer",
  STALE: "outline",
  PROBABLY_KILLED: "secondary",
  KILLED: "secondary",
  CLOSED: "secondary",
} satisfies Record<HeroSightingStatus, BadgeProps["variant"]>;

type HeroSightingStatusBadgeProps = {
  status: HeroSightingStatus;
};

export const HeroSightingStatusBadge = ({
  status,
}: HeroSightingStatusBadgeProps) => {
  const { t } = useTranslation();

  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      // An unconfirmed hero is not where the board last saw it; say why.
      title={
        status === "STALE" ? t("heroSightings.staleDescription") : undefined
      }
      className="shrink-0 text-xs whitespace-nowrap"
    >
      {t(`heroSightings.status.${status}`)}
    </Badge>
  );
};
