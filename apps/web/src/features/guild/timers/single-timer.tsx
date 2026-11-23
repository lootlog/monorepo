import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { NpcSearchTile } from "@/components/tiles/npc-search-tile";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { Globe, User } from "lucide-react";
import { useEffect, useId, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import type {
  HeroSightingResponseDto,
  TimerResponseDto,
} from "@lootlog/client/main";
import type { TimerColorPaint } from "@lootlog/domain/timer-colors";
import {
  getTimerPhase,
  getTimerTimeLeft,
  type TimerCountdownMode,
} from "@lootlog/domain/timers";
import { formatLevel } from "@lootlog/domain/profession";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { MemberIdentity } from "@/components/common/member-identity";
import { MetaItem } from "@/components/common/meta-item";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@/components/common/list-tile";
import { TimerCountdown } from "./timer-countdown";
import { TimerDetails } from "./timer-details";
import { HeroSightingTimerLocation } from "@/features/guild/hero-sightings/hero-sighting-timer-location";

const veil = (color: string, isExpired: boolean) =>
  isExpired ? `color-mix(in srgb, ${color}, black 40%)` : color;

type SingleTimerProps = {
  timer: TimerResponseDto;
  paint: TimerColorPaint;
  countdownMode: TimerCountdownMode;
  removeTimerAfterMs: number;
  showWorld?: boolean;
  heroSighting?: HeroSightingResponseDto;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  timer,
  paint,
  countdownMode,
  removeTimerAfterMs,
  showWorld = false,
  heroSighting,
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);
  const contentId = useId();

  useEffect(() => subscribeToSecondClock(() => setNow(Date.now())), []);

  const timeLeft = getTimerTimeLeft(timer, now);
  const phase = getTimerPhase(timeLeft, removeTimerAfterMs);
  const phaseChangeCount = useChangeCount(phase);

  const announcesPhase =
    phaseChangeCount > 0 && (phase === "window" || phase === "entrance");

  const fill = veil(paint.fill, phase === "expired");
  const wash = `color-mix(in srgb, ${fill} 25%, transparent)`;
  const npcName = timer.npc?.name ?? "";
  const npcIcon = timer.npc?.icon ?? null;

  const npcLevel =
    timer.npc && timer.npc.lvl > 0
      ? formatLevel(timer.npc.lvl, timer.npc.prof)
      : null;

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(${wash}, ${wash})`,
      }}
      className={cn(
        "relative h-full w-full",
        LIST_TILE_HOVER_CLASS,
        phase === "expired" && "opacity-75",
      )}
    >
      {announcesPhase && (
        <span
          key={phaseChangeCount}
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-arrival motion-reduce:animate-none"
        />
      )}
      <Popover>
        <PopoverTrigger
          openOnHover
          render={
            <button
              type="button"
              aria-labelledby={contentId}
              className="absolute inset-0 outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            />
          }
        />
        <PopoverContent className="grid w-auto gap-2 px-3 py-2">
          <TimerDetails timer={timer} phase={phase} />
        </PopoverContent>
      </Popover>
      <div
        id={contentId}
        className={cn(
          "pointer-events-none relative flex h-full w-full items-center gap-3 py-2.5 text-left",
          LIST_TILE_INSET_CLASS,
        )}
      >
        {npcIcon && <NpcSearchTile icon={npcIcon} />}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="min-w-0 truncate text-sm font-semibold">
              {npcName}
            </span>
            {npcLevel && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {npcLevel}
              </span>
            )}
          </span>
          <span
            className={cn(
              "flex min-w-0 items-center gap-x-3",
              heroSighting && "flex-wrap gap-y-1",
            )}
          >
            {showWorld && (
              <MetaItem
                icon={Globe}
                label={t("loots.list.worldLabel")}
                className="shrink-0"
              >
                {upperFirst(timer.world)}
              </MetaItem>
            )}
            {heroSighting && (
              <HeroSightingTimerLocation sighting={heroSighting} now={now} />
            )}
            {timer.member?.name && (
              <MetaItem icon={User} className="min-w-0">
                <MemberIdentity
                  member={{ memberId: timer.member.id }}
                  fallback={{ name: timer.member.name }}
                  display="name"
                  className="pointer-events-auto"
                  nameClassName="text-xs leading-tight font-normal"
                />
              </MetaItem>
            )}
          </span>
        </span>
        <TimerCountdown
          timeLeft={timeLeft}
          phase={phase}
          countdownMode={countdownMode}
        />
      </div>
    </div>
  );
};
