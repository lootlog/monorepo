import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { HeroSightingStatus } from "./hero-sighting-status";
import { HERO_SIGHTING_STATUS_APPEARANCE } from "./hero-sighting-status-appearance";

type HeroSightingStatusLabelProps = {
  status: HeroSightingStatus;
  className?: string;
};

/** The status named in its colour. */
export const HeroSightingStatusLabel = ({
  status,
  className,
}: HeroSightingStatusLabelProps) => {
  const { t } = useTranslation();

  return (
    <span
      // An unconfirmed hero is not where the board last saw it; say why.
      title={
        status === "STALE" ? t("heroSightings.staleDescription") : undefined
      }
      className={cn(
        "shrink-0 font-semibold",
        HERO_SIGHTING_STATUS_APPEARANCE[status].textClassName,
        className,
      )}
    >
      {t(`heroSightings.status.${status}`)}
    </span>
  );
};
