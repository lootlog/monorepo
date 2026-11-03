import type {
  HeroSightingResponseDto,
  TimerResponseDto,
} from "@lootlog/client/main";
import type { TimerCountdownMode } from "@lootlog/domain/timers";
import { Flag, MapPin } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { MemberAvatar } from "@/components/common/member-avatar";
import { RelativeTime } from "@/components/common/relative-time";
import { HeroSightingClaimButton } from "./hero-sighting-claim-button";
import { HeroSightingClaims } from "./hero-sighting-claims";
import { DETECTOR_NAME_CLASS } from "./hero-sighting-detector-highlight";
import { HeroSightingHero } from "./hero-sighting-hero";
import { HeroSightingHistoryButton } from "./hero-sighting-history-button";
import { getHeroSightingStatus } from "./hero-sighting-status";
import { HeroSightingStatusIcon } from "./hero-sighting-status-icon";
import { HeroSightingStatusLabel } from "./hero-sighting-status-label";
import { HeroSightingTimer } from "./hero-sighting-timer";

type HeroSightingRowProps = {
  sighting: HeroSightingResponseDto;
  timer: TimerResponseDto | undefined;
  now: number;
  showWorld: boolean;
  countdownMode: TimerCountdownMode;
  removeTimerAfterMs: number;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

/**
 * One hero on the board. Phones stack the hero over its map and claims, with
 * the timer at the right; from `xl` every row shares the same columns.
 */
export const HeroSightingRow = ({
  sighting,
  timer,
  now,
  showWorld,
  countdownMode,
  removeTimerAfterMs,
  onOpenHistory,
}: HeroSightingRowProps) => {
  const { t } = useTranslation();
  const status = getHeroSightingStatus(sighting, now);
  const titleId = `hero-sighting-${sighting.id}`;

  const lastSeenByOther =
    sighting.lastSeenBy.memberId !== sighting.detectedBy.memberId;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 py-3",
        "xl:grid-cols-[2.25rem_minmax(0,16rem)_minmax(0,1fr)_8.5rem_minmax(0,1fr)_10rem] xl:items-center xl:gap-x-5",
        LIST_TILE_INSET_CLASS,
      )}
    >
      <HeroSightingStatusIcon
        status={status}
        className="size-9 rounded-lg xl:row-start-1"
      />

      <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5 self-center">
        <HeroSightingHero
          id={titleId}
          sighting={sighting}
          showWorld={showWorld}
        />
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs text-muted-foreground">
          <HeroSightingStatusLabel status={status} />
          <span aria-hidden="true">·</span>
          {sighting.closedAt === null ? (
            <span className="min-w-0">
              {`${t("heroSightings.lastDetected")} `}
              <RelativeTime at={sighting.lastSeenAt} now={now} />
            </span>
          ) : (
            <RelativeTime at={sighting.closedAt} now={now} />
          )}
        </span>
      </div>

      <div className="col-start-2 row-start-2 flex min-w-0 flex-col gap-1 xl:col-start-3 xl:row-start-1">
        <p className="flex min-w-0 items-start gap-1.5 text-sm leading-5 font-medium">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span className="sr-only">{`${t("heroSightings.map")}: `}</span>
          <span className="min-w-0 break-words">{sighting.mapName}</span>
        </p>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <MemberAvatar
            avatarUrl={sighting.detectedBy.avatarUrl}
            name={sighting.detectedBy.displayName}
            imageSize={32}
            className="size-4 text-[9px]"
          />
          <span className="min-w-0 truncate">
            {t("heroSightings.detectedByShort")}{" "}
            <span className={DETECTOR_NAME_CLASS}>
              {sighting.detectedBy.displayName}
            </span>
            {sighting.detectorCharacter && (
              <> ({sighting.detectorCharacter.name})</>
            )}
            {lastSeenByOther && (
              <>
                {" · "}
                {t("heroSightings.lastSeenByShort", {
                  name: sighting.lastSeenBy.displayName,
                })}
              </>
            )}
          </span>
        </span>
      </div>

      <HeroSightingTimer
        timer={timer}
        countdownMode={countdownMode}
        removeTimerAfterMs={removeTimerAfterMs}
        className="col-start-3 row-start-2 items-end text-right xl:col-start-4 xl:row-start-1 xl:items-start xl:text-left"
      />

      <div className="col-span-2 col-start-2 row-start-3 flex min-w-0 items-start gap-1.5 xl:col-span-1 xl:col-start-5 xl:row-start-1 xl:items-center">
        <Flag
          aria-hidden="true"
          className="mt-1.5 size-4 shrink-0 text-muted-foreground xl:mt-0"
        />
        <HeroSightingClaims sighting={sighting} />
      </div>

      <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 self-start xl:col-start-6 xl:self-center">
        <HeroSightingClaimButton sighting={sighting} />
        <HeroSightingHistoryButton sighting={sighting} onOpen={onOpenHistory} />
      </div>
    </article>
  );
};
