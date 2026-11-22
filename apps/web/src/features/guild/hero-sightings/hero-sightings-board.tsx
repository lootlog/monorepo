import type {
  HeroSightingResponseDto,
  TimerResponseDto,
} from "@lootlog/client/main";
import type { TimerCountdownMode } from "@lootlog/domain/timers";
import { groupBy } from "es-toolkit";
import { useTranslation } from "react-i18next";
import { BandSection } from "@/components/common/band-section";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { findHeroSightingTimer } from "./find-timer-hero-sighting";
import { HeroSightingRow } from "./hero-sighting-row";
import {
  getHeroSightingGroup,
  getHeroSightingStatus,
  HERO_SIGHTING_GROUPS,
} from "./hero-sighting-status";

type HeroSightingsBoardProps = {
  sightings: HeroSightingResponseDto[];
  timers: TimerResponseDto[] | undefined;
  heroTimers: TimerResponseDto[];
  now: number;
  showWorld: boolean;
  countdownMode: TimerCountdownMode;
  removeTimerAfterMs: number;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

export const HeroSightingsBoard = ({
  sightings,
  timers,
  heroTimers,
  now,
  showWorld,
  countdownMode,
  removeTimerAfterMs,
  onOpenHistory,
}: HeroSightingsBoardProps) => {
  const { t } = useTranslation();

  const groups = groupBy(sightings, (sighting) =>
    getHeroSightingGroup(getHeroSightingStatus(sighting, now)),
  );

  return HERO_SIGHTING_GROUPS.map((group) => {
    if (!(group in groups)) return null;
    const groupSightings = groups[group];

    return (
      <BandSection
        key={group}
        id={`hero-sightings-group-${group}`}
        title={t(`heroSightings.groups.${group}`)}
        count={groupSightings.length}
        tiled
      >
        <ul>
          {groupSightings.map((sighting) => (
            <li
              key={sighting.id}
              data-list-tile
              className={LIST_TILE_RULE_CLASS}
            >
              <HeroSightingRow
                sighting={sighting}
                timer={findHeroSightingTimer(timers, sighting)}
                lastTimer={findHeroSightingTimer(heroTimers, sighting)}
                now={now}
                showWorld={showWorld}
                countdownMode={countdownMode}
                removeTimerAfterMs={removeTimerAfterMs}
                onOpenHistory={onOpenHistory}
              />
            </li>
          ))}
        </ul>
      </BandSection>
    );
  });
};
