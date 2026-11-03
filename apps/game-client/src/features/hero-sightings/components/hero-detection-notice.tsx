import { cn } from "cn";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isHeroSightingClaimedBy } from "@lootlog/domain/hero-sightings";
import { formatLevel } from "@lootlog/domain/profession";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  toolbarStripClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";
import { useHeroSightingClaim } from "@/features/hero-sightings/hooks/use-hero-sighting-claim";
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
      className={cn(
        toolbarStripClassName,
        toolbarStripRowClassName,
        "ll:-mt-px ll:shrink-0 ll:items-center ll:gap-1 ll:px-1.5 ll:text-[11px]",
      )}
    >
      <span className="ll:min-w-0 ll:flex-1 ll:truncate">
        <span className="ll:text-muted-foreground">{t("notice.title")}: </span>
        <span className="ll:font-semibold ll:text-white">
          {first.hero.name} ({formatLevel(first.hero.lvl, first.hero.prof)})
        </span>{" "}
        <span className="ll:text-muted-foreground">
          {t(`state.${first.state}`)}
        </span>{" "}
        <span className="ll:font-semibold ll:text-green-300">
          {first.mapName}
        </span>
      </span>
      {claimable.length > 0 ? (
        <Button
          type="button"
          size="xs"
          className="ll:shrink-0"
          disabled={isPending}
          onClick={() => claim(claimable)}
        >
          {t("actions.claim")}
        </Button>
      ) : null}
      <IconButton label={t("actions.dismiss")} onClick={onDismiss}>
        <X aria-hidden="true" />
      </IconButton>
    </div>
  );
}
