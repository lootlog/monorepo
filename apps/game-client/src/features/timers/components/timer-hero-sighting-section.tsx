import { useTranslation } from "react-i18next";
import { formatSightingAge } from "@/features/hero-sightings/format-sighting-age";
import { getHeroSightingRefresher } from "@/features/hero-sightings/hero-sighting-rows";
import { useNow } from "@/hooks/ui/use-now";
import { TimerHeroSightingIndicator } from "./timer-hero-sighting-indicator";
import type { TimerHeroSighting } from "./timer-map-presence-provider";
import { TimerTooltipSection } from "./timer-tooltip-section";

/** Where a detector placed the timer's hero, how long ago and who claims it. */
export function TimerHeroSightingSection({
  heroSighting: { sighting, unconfirmed },
}: {
  heroSighting: TimerHeroSighting;
}) {
  const { t } = useTranslation("timers");
  const { t: tHero } = useTranslation("heroSightings");
  const now = useNow(60_000);
  const refreshedBy = getHeroSightingRefresher(sighting);

  return (
    <TimerTooltipSection
      heading={
        <>
          <TimerHeroSightingIndicator
            sighting={sighting}
            unconfirmed={unconfirmed}
            decorative
          />
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
        {unconfirmed ? ` · ${tHero("status.unconfirmed")}` : null}
        {" · "}
        {tHero("detectedBy", { name: sighting.detectedBy.displayName })}
        {refreshedBy
          ? ` · ${tHero("refreshedBy", { name: refreshedBy.displayName })}`
          : null}
      </span>
      {sighting.claims.length > 0 ? (
        <span>
          {t("tooltip.heroSightingClaims", { count: sighting.claims.length })}
        </span>
      ) : null}
    </TimerTooltipSection>
  );
}
