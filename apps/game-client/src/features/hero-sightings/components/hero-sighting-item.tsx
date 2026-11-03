import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import { isHeroSightingClaimedBy } from "@lootlog/domain/hero-sightings";
import { ListRow } from "@/components/list-row";
import { Button } from "@/components/ui/button";
import { HeroSightingClaimers } from "@/features/hero-sightings/components/hero-sighting-claimers";
import { HeroSightingDetector } from "@/features/hero-sightings/components/hero-sighting-detector";
import { HeroSightingHistoryPopover } from "@/features/hero-sightings/components/hero-sighting-history-popover";
import { HeroSightingPlace } from "@/features/hero-sightings/components/hero-sighting-place";
import { formatSightingAge } from "@/features/hero-sightings/format-sighting-age";
import type { HeroSightingRow } from "@/features/hero-sightings/hero-sighting-rows";
import { useHeroSightingClaim } from "@/features/hero-sightings/hooks/use-hero-sighting-claim";

type HeroSightingItemProps = {
  row: HeroSightingRow;
  now: number;
  userId: string | undefined;
  /** Organizations where the player may claim. */
  writableGuildIds: ReadonlySet<string>;
};

/**
 * One sighted hero: where it roams or will spawn, how long ago, who found it
 * and who claims it. Claiming is an explicit choice; finding a hero does not
 * claim it.
 */
export function HeroSightingItem({
  row,
  now,
  userId,
  writableGuildIds,
}: HeroSightingItemProps) {
  const { t } = useTranslation("heroSightings");
  const { claim, unclaim, isPending } = useHeroSightingClaim();

  const claimedSightings = row.sightings.filter((sighting) =>
    isHeroSightingClaimedBy(sighting, userId),
  );

  const claimableSightings = row.sightings.filter(
    (sighting) =>
      !isHeroSightingClaimedBy(sighting, userId) &&
      writableGuildIds.has(sighting.guildId),
  );

  const isClaimed = claimedSightings.length > 0;

  return (
    <ListRow
      className={cn(
        "ll:flex-col ll:items-stretch ll:gap-0.5 ll:px-2 ll:py-1.5 ll:text-[11px]",
        !row.isCurrent && "ll:opacity-60",
      )}
    >
      <span className="ll:flex ll:min-w-0 ll:items-baseline ll:justify-between ll:gap-2">
        <span className="ll:min-w-0 ll:truncate ll:text-white">
          {row.hero.name}
          <span className="ll:ml-1 ll:font-normal ll:text-muted-foreground">
            ({formatLevel(row.hero.lvl, row.hero.prof)})
          </span>
        </span>
        <span className="ll:shrink-0 ll:font-normal ll:tabular-nums ll:text-muted-foreground">
          {formatSightingAge(t, row.lastSeenAt, now)}
        </span>
      </span>
      <HeroSightingPlace sighting={row} isCurrent={row.isCurrent} now={now} />
      <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1">
        <HeroSightingDetector member={row.detectedBy} />
        <span className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-1 ll:font-normal">
          <HeroSightingClaimers claims={row.claims} />
        </span>
        <HeroSightingHistoryPopover row={row} now={now} />
        {row.isCurrent && (isClaimed || claimableSightings.length > 0) ? (
          <Button
            type="button"
            size="xs"
            variant={isClaimed ? "outline" : "secondary"}
            className="ll:shrink-0"
            disabled={isPending}
            onClick={() =>
              isClaimed ? unclaim(claimedSightings) : claim(claimableSightings)
            }
          >
            {isClaimed ? t("actions.unclaim") : t("actions.claim")}
          </Button>
        ) : null}
      </span>
    </ListRow>
  );
}
