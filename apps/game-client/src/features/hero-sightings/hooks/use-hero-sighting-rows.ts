import { projectHeroSightingRows } from "@/features/hero-sightings/hero-sighting-rows";
import { useTimersWorld } from "@/features/timers/hooks/use-timers-world";
import { useHeroSightings } from "@/hooks/api/use-hero-sightings";
import { useTimersStore } from "@/store/timers.store";

/**
 * The sightings of the timers' world as the window lists them: the selected
 * Lootlog, or every Lootlog merged while timer grouping is on.
 */
export const useHeroSightingRows = () => {
  const { guildId, world } = useTimersWorld();

  const isGrouping = useTimersStore(
    (state) => state.generalConfig.timersGrouping,
  );

  const query = useHeroSightings(world);
  const sightings = query.data ?? [];
  const rows = projectHeroSightingRows(sightings, { guildId, isGrouping });

  return { query, sightings, rows };
};
