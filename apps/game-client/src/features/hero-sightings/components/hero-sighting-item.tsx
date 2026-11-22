import { cn } from "cn";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import {
  isHeroSightingClaimable,
  isHeroSightingClaimedBy,
} from "@lootlog/domain/hero-sightings";
import { ListRow } from "@/components/list-row";
import { TruncatedText } from "@/components/truncated-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { HeroSightingClaimers } from "@/features/hero-sightings/components/hero-sighting-claimers";
import { HeroSightingDetector } from "@/features/hero-sightings/components/hero-sighting-detector";
import { HeroSightingHistoryPopover } from "@/features/hero-sightings/components/hero-sighting-history-popover";
import { HeroSightingPlace } from "@/features/hero-sightings/components/hero-sighting-place";
import { HeroSightingRefresher } from "@/features/hero-sightings/components/hero-sighting-refresher";
import { formatSeenAgo } from "@/utils/format-seen-ago";
import {
  isWithdrawableHeroSighting,
  type HeroSightingRow,
} from "@/features/hero-sightings/hero-sighting-rows";
import { useHeroSightingActions } from "@/features/hero-sightings/hooks/use-hero-sighting-actions";

type HeroSightingItemProps = {
  row: HeroSightingRow;
  now: number;
  userId: string | undefined;
  writableGuildIds: ReadonlySet<string>;
};

export function HeroSightingItem({
  row,
  now,
  userId,
  writableGuildIds,
}: HeroSightingItemProps) {
  const { t } = useTranslation("heroSightings");
  const { claim, unclaim, withdraw, isPending } = useHeroSightingActions();

  const claimedSightings = row.sightings.filter((sighting) =>
    isHeroSightingClaimedBy(sighting, userId),
  );

  const claimableSightings = row.sightings.filter(
    (sighting) =>
      isHeroSightingClaimable(sighting) &&
      !isHeroSightingClaimedBy(sighting, userId) &&
      writableGuildIds.has(sighting.guildId),
  );

  const isClaimed = claimedSightings.length > 0;

  const withdrawableSightings = row.sightings.filter((sighting) =>
    isWithdrawableHeroSighting(sighting, userId),
  );

  return (
    <ListRow
      className={cn(
        "ll:flex-col ll:items-stretch ll:gap-0.5 ll:px-2 ll:py-1.5 ll:text-[11px]",
        !row.isCurrent && "ll:opacity-60",
      )}
    >
      <span className="ll:flex ll:min-w-0 ll:items-baseline ll:justify-between ll:gap-2">
        <TruncatedText className="ll:text-white">
          {row.hero.name}
          <span className="ll:ml-1 ll:font-normal ll:text-muted-foreground">
            ({formatLevel(row.hero.lvl, row.hero.prof)})
          </span>
        </TruncatedText>
        <span className="ll:flex ll:min-w-0 ll:shrink-0 ll:items-center ll:gap-1 ll:font-normal ll:tabular-nums ll:text-muted-foreground">
          {row.refreshedBy ? (
            <HeroSightingRefresher member={row.refreshedBy} />
          ) : null}
          <span className="ll:shrink-0">
            {formatSeenAgo(now - Date.parse(row.lastSeenAt), "minute")}
          </span>
        </span>
      </span>
      <HeroSightingPlace sighting={row} isCurrent={row.isCurrent} now={now} />
      <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1">
        <HeroSightingDetector member={row.detectedBy} manual={row.manual} />
        <span className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-1 ll:font-normal">
          {row.state === "SPAWNING" || row.claims.length > 0 ? (
            <HeroSightingClaimers claims={row.claims} />
          ) : null}
        </span>
        <HeroSightingHistoryPopover row={row} now={now} />
        {withdrawableSightings.length > 0 ? (
          <IconButton
            label={t("actions.withdraw")}
            variant="quiet-destructive"
            disabled={isPending}
            onClick={() => withdraw(withdrawableSightings)}
          >
            <Trash2 aria-hidden className="ll:size-3.5" />
          </IconButton>
        ) : null}
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
