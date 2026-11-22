import { useTranslation } from "react-i18next";
import { formatSeenAgo } from "@/utils/format-seen-ago";
import { getHeroSightingRefresher } from "@/features/hero-sightings/hero-sighting-rows";
import { useNow } from "@/hooks/ui/use-now";
import { TimerHeroSightingIndicator } from "./timer-hero-sighting-indicator";
import type { TimerHeroSighting } from "./timer-map-presence-provider";
import { TimerTooltipSection } from "./timer-tooltip-section";

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
        {formatSeenAgo(now - Date.parse(sighting.lastSeenAt), "minute")}
        {unconfirmed ? ` · ${tHero("status.unconfirmed")}` : null}
        {" · "}
        {tHero(sighting.manual ? "addedBy" : "detectedBy", {
          name: sighting.detectedBy.displayName,
        })}
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
