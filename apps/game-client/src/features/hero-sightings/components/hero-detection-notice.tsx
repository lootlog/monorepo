import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  isHeroSightingClaimable,
  isHeroSightingClaimedBy,
} from "@lootlog/domain/hero-sightings";
import { formatLevel } from "@lootlog/domain/profession";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Notice } from "@/components/notice";
import { TruncatedText } from "@/components/truncated-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { HeroSightingPlace } from "@/features/hero-sightings/components/hero-sighting-place";
import { useHeroSightingActions } from "@/features/hero-sightings/hooks/use-hero-sighting-actions";
import { useNow } from "@/hooks/ui/use-now";
import type { OwnHeroDetection } from "@/store/hero-sightings.store";

type HeroDetectionNoticeProps = {
  detection: OwnHeroDetection;
  sightings: readonly HeroSightingResponseDto[];
  userId: string | undefined;
  writableGuildIds: ReadonlySet<string>;
  className?: string;
  onDismiss: () => void;
};

export function HeroDetectionNotice({
  detection,
  sightings,
  userId,
  writableGuildIds,
  className,
  onDismiss,
}: HeroDetectionNoticeProps) {
  const { t } = useTranslation("heroSightings");
  const { claim, isPending } = useHeroSightingActions();
  const now = useNow(60_000);

  const latest = detection.sightings.map(
    (own) => sightings.find((sighting) => sighting.id === own.id) ?? own,
  );

  const [first] = latest;

  if (!first) return null;

  const claimable = latest.filter(
    (sighting) =>
      isHeroSightingClaimable(sighting) &&
      !isHeroSightingClaimedBy(sighting, userId) &&
      writableGuildIds.has(sighting.guildId),
  );

  return (
    <Notice role="status" tone="warning" layout="strip" className={className}>
      <span className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:gap-0.5 ll:font-semibold">
        <span className="ll:text-warning">
          {t(first.manual ? "notice.manualTitle" : "notice.title")}
        </span>
        <TruncatedText>
          {first.hero.name}
          <span className="ll:ml-1 ll:font-normal ll:text-muted-foreground">
            ({formatLevel(first.hero.lvl, first.hero.prof)})
          </span>
        </TruncatedText>
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
    </Notice>
  );
}
