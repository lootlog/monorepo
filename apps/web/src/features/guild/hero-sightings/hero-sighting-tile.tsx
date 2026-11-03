import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Clock3, Eye, MapPin } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { RelativeTime } from "@/components/common/relative-time";
import { HeroSightingClaimButton } from "./hero-sighting-claim-button";
import { HeroSightingClaims } from "./hero-sighting-claims";
import { HeroSightingFreshness } from "./hero-sighting-freshness";
import { HeroSightingHero } from "./hero-sighting-hero";
import { HeroSightingHistoryButton } from "./hero-sighting-history-button";
import { HeroSightingMember } from "./hero-sighting-member";
import { getHeroSightingStatus } from "./hero-sighting-status";
import { HeroSightingStatusIcon } from "./hero-sighting-status-icon";
import { HeroSightingStatusLabel } from "./hero-sighting-status-label";

type HeroSightingTileProps = {
  sighting: HeroSightingResponseDto;
  now: number;
  showWorld: boolean;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

const FACT_LABEL_CLASS = "mb-1.5 text-xs text-muted-foreground";

/**
 * One hero on the board: its status and where it was detected, when that was
 * confirmed, who found it and who camps it.
 */
export const HeroSightingTile = ({
  sighting,
  now,
  showWorld,
  onOpenHistory,
}: HeroSightingTileProps) => {
  const { t } = useTranslation();
  const status = getHeroSightingStatus(sighting, now);
  const titleId = `hero-sighting-${sighting.id}`;

  const lastSeenByOther =
    sighting.lastSeenBy.memberId !== sighting.detectedBy.memberId;

  return (
    <article
      aria-labelledby={titleId}
      className={cn("flex h-full flex-col gap-3 py-4", LIST_TILE_INSET_CLASS)}
    >
      <div className="flex min-w-0 items-start gap-3">
        <HeroSightingStatusIcon status={status} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <HeroSightingHero
            id={titleId}
            sighting={sighting}
            showWorld={showWorld}
          />
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs text-muted-foreground">
            <HeroSightingStatusLabel status={status} />
            <span aria-hidden="true">·</span>
            {sighting.closedAt === null ? (
              <span className="flex min-w-0 items-baseline gap-1">
                <span>{t("heroSightings.confirmed")}</span>
                <RelativeTime at={sighting.lastSeenAt} now={now} />
              </span>
            ) : (
              <RelativeTime at={sighting.closedAt} now={now} />
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <HeroSightingClaimButton sighting={sighting} />
          <HeroSightingHistoryButton
            sighting={sighting}
            onOpen={onOpenHistory}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="flex min-w-0 items-start gap-1.5 text-sm leading-5 font-medium">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span className="sr-only">{`${t("heroSightings.map")}: `}</span>
          <span className="min-w-0 break-words">{sighting.mapName}</span>
        </p>
        <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <MetaItem icon={Clock3}>
            {t("heroSightings.detectedAgo")}
            <RelativeTime at={sighting.firstSeenAt} now={now} />
          </MetaItem>
          {lastSeenByOther && (
            <MetaItem icon={Eye} className="min-w-0">
              <span className="min-w-0 truncate">
                {t("heroSightings.confirmedBy", {
                  name: sighting.lastSeenBy.displayName,
                })}
              </span>
            </MetaItem>
          )}
        </span>
      </div>

      {status === "ROAMING" && (
        <HeroSightingFreshness sighting={sighting} now={now} />
      )}
      {status === "STALE" && (
        <p className="text-xs text-muted-foreground">
          {t("heroSightings.staleDescription")}
        </p>
      )}

      <dl className="mt-auto grid grid-cols-1 gap-3 border-t border-sidebar-border pt-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0">
          <dt className={FACT_LABEL_CLASS}>{t("heroSightings.detectedBy")}</dt>
          <dd>
            <HeroSightingMember
              member={sighting.detectedBy}
              character={sighting.detectorCharacter}
              highlighted
            />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={FACT_LABEL_CLASS}>{t("heroSightings.claims")}</dt>
          <dd>
            <HeroSightingClaims sighting={sighting} />
          </dd>
        </div>
      </dl>
    </article>
  );
};
