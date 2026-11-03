import { cn } from "cn";
import { Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import { isHeroSightingStale } from "@lootlog/domain/hero-sightings";
import { ListRow } from "@/components/list-row";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import { formatSightingAge } from "@/features/hero-sightings/format-sighting-age";
import {
  isClaimedBy,
  type HeroSightingRow,
} from "@/features/hero-sightings/hero-sighting-rows";
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
    isClaimedBy(sighting, userId),
  );

  const claimableSightings = row.sightings.filter(
    (sighting) =>
      !isClaimedBy(sighting, userId) && writableGuildIds.has(sighting.guildId),
  );

  const isClaimed = claimedSightings.length > 0;
  const isStale = row.isCurrent && isHeroSightingStale(row, now);

  const status = row.closeReason
    ? t(`status.${row.closeReason}`)
    : isStale
      ? t("status.unconfirmed")
      : null;

  const detectorName = row.detectedBy.displayName;

  return (
    <ListRow
      className={cn(
        "ll:flex-col ll:items-stretch ll:gap-0.5 ll:py-1 ll:text-[11px]",
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
      <span className="ll:flex ll:min-w-0 ll:items-baseline ll:gap-1">
        <span className="ll:shrink-0 ll:font-normal ll:text-muted-foreground">
          {t(`state.${row.state}`)}
        </span>
        <span
          className={cn(
            "ll:min-w-0 ll:truncate",
            row.isCurrent && !isStale ? "ll:text-green-300" : "ll:text-white",
          )}
        >
          {row.mapName}
        </span>
        {status ? (
          <span
            className={cn(
              "ll:ml-auto ll:shrink-0",
              row.closeReason ? "ll:text-red-400" : "ll:text-orange-300",
            )}
          >
            {status}
          </span>
        ) : null}
      </span>
      <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1">
        <span className="ll:flex ll:min-w-0 ll:shrink-0 ll:items-center ll:gap-1 ll:rounded-sm ll:bg-amber-400/15 ll:px-1 ll:text-amber-200">
          <Radar aria-hidden="true" className="ll:size-3 ll:shrink-0" />
          <MemberAvatar
            name={detectorName}
            avatarUrl={row.detectedBy.avatarUrl}
          />
          <span className="ll:sr-only">
            {t("detectedBy", { name: detectorName })}
          </span>
          <span aria-hidden="true" className="ll:max-w-24 ll:truncate">
            {detectorName}
          </span>
        </span>
        <span className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-1 ll:font-normal">
          {row.claims.length > 0 ? (
            <>
              <span className="ll:shrink-0 ll:text-muted-foreground">
                {t("claims.label")}
              </span>
              <span className="ll:min-w-0 ll:truncate ll:text-white">
                {row.claims.map((entry) => entry.member.displayName).join(", ")}
              </span>
            </>
          ) : (
            <span className="ll:min-w-0 ll:truncate ll:text-muted-foreground">
              {t("claims.none")}
            </span>
          )}
        </span>
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
