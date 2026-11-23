import { cn } from "cn";
import { Eye, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import {
  isHeroSightingClaimable,
  isHeroSightingClaimedBy,
} from "@lootlog/domain/hero-sightings";
import { ListRow } from "@/components/list-row";
import { TruncatedText } from "@/components/truncated-text";
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
import type { HeroSightingMemberColors } from "@/features/hero-sightings/hooks/use-hero-sighting-member-colors";

type HeroSightingItemProps = {
  row: HeroSightingRow;
  now: number;
  userId: string | undefined;
  writableGuildIds: ReadonlySet<string>;
  memberColors: HeroSightingMemberColors;
};

export function HeroSightingItem({
  row,
  now,
  userId,
  writableGuildIds,
  memberColors,
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

  const showsClaimers = row.state === "SPAWNING" || row.claims.length > 0;

  const actions = (
    <span className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
      <HeroSightingHistoryPopover
        row={row}
        now={now}
        memberColors={memberColors}
      />
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
        <IconButton
          label={isClaimed ? t("actions.unclaim") : t("actions.claim")}
          active={isClaimed}
          disabled={isPending}
          onClick={() =>
            isClaimed ? unclaim(claimedSightings) : claim(claimableSightings)
          }
        >
          <Eye aria-hidden className="ll:size-3.5" />
        </IconButton>
      ) : null}
    </span>
  );

  return (
    <ListRow
      className={cn(
        "ll:flex-col ll:items-stretch ll:gap-0.5 ll:px-2 ll:py-1.5 ll:text-[11px]",
        !row.isCurrent && "ll:opacity-60",
      )}
    >
      <span className="ll:flex ll:min-w-0 ll:items-baseline ll:justify-between ll:gap-2">
        <TruncatedText className="ll:text-foreground">
          {row.hero.name}
          <span className="ll:ml-1 ll:font-normal ll:text-muted-foreground">
            ({formatLevel(row.hero.lvl, row.hero.prof)})
          </span>
        </TruncatedText>
        <span className="ll:flex ll:shrink-0 ll:items-center ll:font-normal ll:tabular-nums ll:text-muted-foreground">
          <HeroSightingRefresher
            member={row.refreshedBy}
            memberColors={memberColors}
          >
            {formatSeenAgo(now - Date.parse(row.lastSeenAt), "minute")}
          </HeroSightingRefresher>
        </span>
      </span>
      <HeroSightingPlace sighting={row} isCurrent={row.isCurrent} now={now} />
      <span
        className={cn(
          "ll:flex ll:min-w-0 ll:gap-1",
          showsClaimers ? "ll:items-end" : "ll:items-start",
        )}
      >
        <span className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:gap-0.5">
          <HeroSightingDetector
            member={row.detectedBy}
            manual={row.manual}
            memberColors={memberColors}
          />
          {showsClaimers ? (
            <HeroSightingClaimers
              claims={row.claims}
              memberColors={memberColors}
            />
          ) : null}
        </span>
        {actions}
      </span>
    </ListRow>
  );
}
