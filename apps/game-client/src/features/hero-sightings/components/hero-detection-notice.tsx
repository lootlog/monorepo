import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isHeroSightingClaimedBy } from "@lootlog/domain/hero-sightings";
import { formatLevel } from "@lootlog/domain/profession";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { HeroSightingPlace } from "@/features/hero-sightings/components/hero-sighting-place";
import { useHeroSightingClaim } from "@/features/hero-sightings/hooks/use-hero-sighting-claim";
import { useNow } from "@/hooks/ui/use-now";
import type { OwnHeroDetection } from "@/store/hero-sightings.store";

type HeroDetectionNoticeProps = {
  detection: OwnHeroDetection;
  /** The latest copy of every listed sighting, so claims made since show. */
  sightings: readonly HeroSightingResponseDto[];
  userId: string | undefined;
  writableGuildIds: ReadonlySet<string>;
  onDismiss: () => void;
};

/**
 * Names the hero the player's own detector just found and offers to claim it
 * in every Organization that accepted the detection.
 */
export function HeroDetectionNotice({
  detection,
  sightings,
  userId,
  writableGuildIds,
  onDismiss,
}: HeroDetectionNoticeProps) {
  const { t } = useTranslation("heroSightings");
  const { claim, isPending } = useHeroSightingClaim();
  const now = useNow(60_000);

  const latest = detection.sightings.map(
    (own) => sightings.find((sighting) => sighting.id === own.id) ?? own,
  );

  const [first] = latest;

  if (!first) return null;

  const claimable = latest.filter(
    (sighting) =>
      sighting.closedAt === null &&
      !isHeroSightingClaimedBy(sighting, userId) &&
      writableGuildIds.has(sighting.guildId),
  );

  return (
    <div
      role="status"
      className="ll:-mt-px ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:border-x-0 ll:border-y ll:border-solid ll:border-amber-400/40 ll:bg-amber-400/10 ll:px-2 ll:py-1.5 ll:text-[11px] ll:font-semibold"
    >
      <span className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:gap-0.5">
        <span className="ll:text-amber-200">{t("notice.title")}</span>
        <span className="ll:min-w-0 ll:truncate ll:text-white">
          {first.hero.name}
          <span className="ll:ml-1 ll:font-normal ll:text-muted-foreground">
            ({formatLevel(first.hero.lvl, first.hero.prof)})
          </span>
        </span>
        <HeroSightingPlace
          sighting={first}
          isCurrent={first.closedAt === null}
          now={now}
        />
      </span>
      {claimable.length > 0 ? (
        <Button
          type="button"
          size="xs"
          variant="secondary"
          disabled={isPending}
          onClick={() => claim(claimable)}
        >
          {t("actions.claim")}
        </Button>
      ) : null}
      <IconButton
        label={t("actions.dismiss")}
        className="ll:-mr-0.5"
        onClick={onDismiss}
      >
        <X aria-hidden="true" />
      </IconButton>
    </div>
  );
}
