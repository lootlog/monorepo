import { cn } from "cn";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { ListRow } from "@/components/list-row";
import { HeroSightingClaimers } from "@/features/hero-sightings/components/hero-sighting-claimers";
import { HeroSightingDetector } from "@/features/hero-sightings/components/hero-sighting-detector";
import { HeroSightingPlace } from "@/features/hero-sightings/components/hero-sighting-place";
import { isHeroSightingDetectorClaim } from "@/features/hero-sightings/hero-sighting-rows";
import { format } from "@/utils/local-date";

type HeroSightingHistoryEntryProps = {
  sighting: HeroSightingResponseDto;
  now: number;
};

/** One past or current sighting in a hero's history, laid out like its list row. */
export function HeroSightingHistoryEntry({
  sighting,
  now,
}: HeroSightingHistoryEntryProps) {
  const isCurrent = sighting.closedAt === null;

  const claims = sighting.claims.map((claim) => ({
    ...claim,
    isDetector: isHeroSightingDetectorClaim(sighting, claim),
  }));

  return (
    <ListRow
      className={cn(
        "ll:flex-col ll:items-stretch ll:gap-0.5 ll:py-1 ll:text-[11px]",
        !isCurrent && "ll:opacity-60",
      )}
    >
      <HeroSightingPlace sighting={sighting} isCurrent={isCurrent} now={now} />
      <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1">
        <HeroSightingDetector member={sighting.detectedBy} />
        <span className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-1 ll:font-normal">
          <HeroSightingClaimers claims={claims} />
        </span>
        <time
          dateTime={sighting.firstSeenAt}
          className="ll:shrink-0 ll:font-normal ll:tabular-nums ll:text-muted-foreground"
        >
          {format(new Date(sighting.firstSeenAt), "dd.MM HH:mm:ss")}
        </time>
      </span>
    </ListRow>
  );
}
