import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { isHeroSightingStale } from "@lootlog/domain/hero-sightings";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MetaItem } from "@/components/common/meta-item";
import { RelativeTime } from "@/components/common/relative-time";

type HeroSightingTimerLocationProps = {
  sighting: HeroSightingResponseDto;
  now: number;
};

/**
 * Where a hero timer's hero was last detected, how long ago, and how many
 * members camp it, on the timer's meta line.
 */
export const HeroSightingTimerLocation = ({
  sighting,
  now,
}: HeroSightingTimerLocationProps) => {
  const { t } = useTranslation();
  const isStale = isHeroSightingStale(sighting, now);

  return (
    <MetaItem icon={MapPin} className="min-w-0">
      <span className="shrink-0">
        {t(`heroSightings.timer.${sighting.state}`)}
      </span>
      <span className="min-w-0 truncate" title={sighting.mapName}>
        {sighting.mapName}
      </span>
      <span aria-hidden="true">·</span>
      <RelativeTime at={sighting.lastSeenAt} now={now} />
      {isStale && (
        <span className="shrink-0">{t("heroSightings.timer.stale")}</span>
      )}
      {sighting.claims.length > 0 && (
        <span className="shrink-0">
          {t("heroSightings.timer.claims", { count: sighting.claims.length })}
        </span>
      )}
    </MetaItem>
  );
};
