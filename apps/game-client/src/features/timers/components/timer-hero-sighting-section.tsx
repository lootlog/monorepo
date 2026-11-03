import { useTranslation } from "react-i18next";
import { isHeroSightingStale } from "@lootlog/domain/hero-sightings";
import type { HeroSighting } from "@/api/hero-sightings.api";
import { formatSightingAge } from "@/features/hero-sightings/format-sighting-age";
import { useMinuteClock } from "@/features/hero-sightings/hooks/use-minute-clock";
import { TimerHeroSightingIndicator } from "./timer-hero-sighting-indicator";
import { TimerTooltipSection } from "./timer-tooltip-section";

/** Where a detector placed the timer's hero, how long ago and who claims it. */
export function TimerHeroSightingSection({
  sighting,
}: {
  sighting: HeroSighting;
}) {
  const { t } = useTranslation("timers");
  const { t: tHero } = useTranslation("heroSightings");
  const now = useMinuteClock();

  return (
    <TimerTooltipSection
      heading={
        <>
          <TimerHeroSightingIndicator sighting={sighting} decorative />
          <span>{t("tooltip.heroSighting")}</span>
        </>
      }
    >
      <span>
        <span className="ll:text-muted-foreground">
          {tHero(`state.${sighting.state}`)}
        </span>{" "}
        {sighting.mapName}
      </span>
      <span className="ll:text-muted-foreground">
        {formatSightingAge(tHero, sighting.lastSeenAt, now)}
        {isHeroSightingStale(sighting, now)
          ? ` · ${tHero("status.unconfirmed")}`
          : null}
        {" · "}
        {tHero("detectedBy", { name: sighting.detectedBy.displayName })}
      </span>
      {sighting.claims.length > 0 ? (
        <span>
          {t("tooltip.heroSightingClaims", { count: sighting.claims.length })}
        </span>
      ) : null}
    </TimerTooltipSection>
  );
}
