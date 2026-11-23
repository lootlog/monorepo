import { cn } from "cn";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { ListRow } from "@/components/list-row";
import { HeroSightingClaimers } from "@/features/hero-sightings/components/hero-sighting-claimers";
import { HeroSightingDetector } from "@/features/hero-sightings/components/hero-sighting-detector";
import { HeroSightingPlace } from "@/features/hero-sightings/components/hero-sighting-place";
import { HeroSightingRefresher } from "@/features/hero-sightings/components/hero-sighting-refresher";
import { getHeroSightingRefresher } from "@/features/hero-sightings/hero-sighting-rows";
import type { HeroSightingMemberColors } from "@/features/hero-sightings/hooks/use-hero-sighting-member-colors";
import { format, isSameLocalDay } from "@/utils/local-date";

type HeroSightingHistoryEntryProps = {
  sighting: HeroSightingResponseDto;
  now: number;
  memberColors: HeroSightingMemberColors;
};

export function HeroSightingHistoryEntry({
  sighting,
  now,
  memberColors,
}: HeroSightingHistoryEntryProps) {
  const isCurrent = sighting.closedAt === null;
  const firstSeenAt = new Date(sighting.firstSeenAt);
  const lastSeenAt = new Date(sighting.lastSeenAt);
  const refreshedBy = getHeroSightingRefresher(sighting);

  const showsClaimers =
    sighting.state === "SPAWNING" || sighting.claims.length > 0;

  return (
    <ListRow
      className={cn(
        "ll:flex-col ll:items-stretch ll:gap-0.5 ll:py-1.5 ll:text-[11px]",
        !isCurrent && "ll:opacity-60",
      )}
    >
      <HeroSightingPlace sighting={sighting} isCurrent={isCurrent} now={now} />
      <HeroSightingDetector
        member={sighting.detectedBy}
        manual={sighting.manual}
        memberColors={memberColors}
      />
      {showsClaimers ? (
        <HeroSightingClaimers
          claims={sighting.claims}
          memberColors={memberColors}
        />
      ) : null}
      <span className="ll:flex ll:min-w-0 ll:items-center ll:overflow-hidden ll:font-normal ll:tabular-nums ll:text-muted-foreground">
        <time dateTime={sighting.firstSeenAt} className="ll:shrink-0">
          {format(firstSeenAt, "dd.MM HH:mm:ss")}
        </time>
        {lastSeenAt > firstSeenAt ? (
          <>
            <span className="ll:shrink-0 ll:whitespace-pre">{" – "}</span>
            <HeroSightingRefresher
              member={refreshedBy}
              memberColors={memberColors}
            >
              <time dateTime={sighting.lastSeenAt}>
                {format(
                  lastSeenAt,
                  isSameLocalDay(firstSeenAt, lastSeenAt)
                    ? "HH:mm:ss"
                    : "dd.MM HH:mm:ss",
                )}
              </time>
            </HeroSightingRefresher>
          </>
        ) : null}
      </span>
    </ListRow>
  );
}
