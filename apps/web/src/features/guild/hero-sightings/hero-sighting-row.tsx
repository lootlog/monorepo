import type {
  HeroSightingResponseDto,
  TimerResponseDto,
} from "@lootlog/client/main";
import type { TimerCountdownMode } from "@lootlog/domain/timers";
import { MapPin } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { MemberIdentity } from "@/components/common/member-identity";
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
import { HeroSightingWithdrawButton } from "./hero-sighting-withdraw-button";

type HeroSightingRowProps = {
  sighting: HeroSightingResponseDto;
  timer: TimerResponseDto | undefined;
  lastTimer: TimerResponseDto | undefined;
  now: number;
  showWorld: boolean;
  countdownMode: TimerCountdownMode;
  removeTimerAfterMs: number;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

/**
 * One hero on the board. Phones stack the hero over its map, timer and
 * claims, with the actions beside the claims; from `xl` every row shares the
 * same columns.
 */
export const HeroSightingRow = ({
  sighting,
  timer,
  lastTimer,
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

  const detector = { memberId: sighting.detectedBy.memberId };

  const detectorFallback = {
    name: sighting.detectedBy.displayName,
    avatarUrl: sighting.detectedBy.avatarUrl,
  };

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 py-3",
        "xl:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_12rem_minmax(0,0.5fr)_11.5rem] xl:items-center xl:gap-x-4",
        LIST_TILE_INSET_CLASS,
      )}
    >
      <HeroSightingStatusIcon
        status={status}
        className="size-9 rounded-lg xl:row-start-1"
      />

      <div className="col-span-2 col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5 self-center xl:col-span-1">
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

      <div className="col-span-2 col-start-2 row-start-2 flex min-w-0 flex-col gap-1 xl:col-span-1 xl:col-start-3 xl:row-start-1">
        <p className="flex min-w-0 items-start gap-1.5 text-sm leading-5 font-medium">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span className="sr-only">{`${t("heroSightings.map")}: `}</span>
          <span className="min-w-0 break-words">{sighting.mapName}</span>
        </p>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <MemberIdentity
            member={detector}
            fallback={detectorFallback}
            display="avatar"
            className="shrink-0"
            avatarClassName="size-4"
          />
          {/* A row of pieces, so a long name shortens without hiding the rest. */}
          <span className="flex min-w-0 items-center whitespace-pre">
            <span className="shrink-0">
              {t(
                sighting.manual
                  ? "heroSightings.addedByHandShort"
                  : "heroSightings.detectedByShort",
              )}{" "}
            </span>
            <MemberIdentity
              member={detector}
              fallback={detectorFallback}
              display="name"
              nameClassName={cn("text-xs", DETECTOR_NAME_CLASS)}
            />
            {sighting.detectorCharacter && (
              <span className="min-w-0 truncate">
                {` (${sighting.detectorCharacter.name})`}
              </span>
            )}
            {lastSeenByOther && (
              <>
                <span className="shrink-0">
                  {` · ${t("heroSightings.lastSeenByShort")} `}
                </span>
                <MemberIdentity
                  member={{ memberId: sighting.lastSeenBy.memberId }}
                  fallback={{
                    name: sighting.lastSeenBy.displayName,
                    avatarUrl: sighting.lastSeenBy.avatarUrl,
                  }}
                  display="name"
                  nameClassName="text-xs font-normal"
                />
              </>
            )}
          </span>
        </span>
      </div>

      <HeroSightingTimer
        timer={timer}
        lastTimer={lastTimer}
        countdownMode={countdownMode}
        removeTimerAfterMs={removeTimerAfterMs}
        className="col-span-2 col-start-2 row-start-3 flex-row flex-wrap items-baseline gap-x-2 xl:col-span-1 xl:col-start-4 xl:row-start-1 xl:flex-col xl:gap-0.5"
      />

      <HeroSightingClaims
        sighting={sighting}
        className="col-start-2 row-start-4 self-center xl:col-start-5 xl:row-start-1"
      />

      <div className="col-start-3 row-start-4 flex items-center justify-end gap-1 self-center xl:col-start-6 xl:row-start-1">
        <HeroSightingClaimButton sighting={sighting} />
        <HeroSightingWithdrawButton sighting={sighting} />
        <HeroSightingHistoryButton sighting={sighting} onOpen={onOpenHistory} />
      </div>
    </article>
  );
};
