import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { groupBy } from "es-toolkit";
import { useTranslation } from "react-i18next";
import { ListGroupHeading } from "@/components/common/list-group-heading";
import {
  LIST_TILE_GRID_CELL_CLASS,
  LIST_TILE_GRID_CLASS,
} from "@/components/common/list-tile";
import {
  getHeroSightingGroup,
  getHeroSightingStatus,
  HERO_SIGHTING_GROUPS,
} from "./hero-sighting-status";
import { HeroSightingTile } from "./hero-sighting-tile";

/** The board's columns, as the timers grid lays out its tiles. */
export const HERO_SIGHTINGS_GRID_CLASS = cn(
  LIST_TILE_GRID_CLASS,
  "lg:grid-cols-2 2xl:grid-cols-3",
);

type HeroSightingsBoardProps = {
  /** Sorted, so each group keeps the order of the board. */
  sightings: HeroSightingResponseDto[];
  now: number;
  showWorld: boolean;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

/** The heroes in groups by status, the ones to act on first. */
export const HeroSightingsBoard = ({
  sightings,
  now,
  showWorld,
  onOpenHistory,
}: HeroSightingsBoardProps) => {
  const { t } = useTranslation();

  const groups = groupBy(sightings, (sighting) =>
    getHeroSightingGroup(getHeroSightingStatus(sighting, now)),
  );

  return HERO_SIGHTING_GROUPS.map((group) => {
    // `groupBy` holds only the groups that have a sighting.
    if (!(group in groups)) return null;
    const groupSightings = groups[group];
    const headingId = `hero-sightings-group-${group}`;

    return (
      <section key={group} aria-labelledby={headingId}>
        <ListGroupHeading id={headingId} count={groupSightings.length}>
          {t(`heroSightings.groups.${group}`)}
        </ListGroupHeading>
        <div className="overflow-hidden">
          <ul className={HERO_SIGHTINGS_GRID_CLASS}>
            {groupSightings.map((sighting) => (
              <li
                key={sighting.id}
                data-list-tile
                className={LIST_TILE_GRID_CELL_CLASS}
              >
                <HeroSightingTile
                  sighting={sighting}
                  now={now}
                  showWorld={showWorld}
                  onOpenHistory={onOpenHistory}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  });
};
