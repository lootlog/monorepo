import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";

// Margonem's red map: any player may attack anyone, with no level limits.
const FULL_PVP_MAP = 2;

type TilePosition = { readonly x: number; readonly y: number };

// How far a walking player and the hero may both have moved since their last reported positions.
const AIR_TAG_SIGHT_LAG_TILES = 1;

/**
 * Whether a tile lies within `marginTiles` inside the hero's war shadow
 * range, where Margonem sends every player standing on it. Every tile is in
 * sight on a map without war shadow.
 */
export const isInHeroSight = (
  position: TilePosition,
  marginTiles: number,
): boolean => {
  const game = useGameStore.getState().game;

  if (!game) return false;
  const range = game.map.visibility;

  if (range <= 0) return true;

  return (
    Math.hypot(position.x - game.hero.x, position.y - game.hero.y) <=
    range - marginTiles
  );
};

/**
 * Whether the hero can already see this player: Margonem draws the hero and
 * every player it received, which it sends only inside the war shadow range.
 * A report inside that range of a player the game does not draw is stale:
 * they have left. AirTags show the rest, so they never cover the game's own
 * characters or the hero's own view.
 */
export const isSeenByHero = (target: {
  readonly targetId: string;
  readonly x: number;
  readonly y: number;
}): boolean =>
  target.targetId === useGameStore.getState().game?.hero.characterId ||
  useOthersStore.getState().othersById[target.targetId] !== undefined ||
  isInHeroSight(target, AIR_TAG_SIGHT_LAG_TILES);

/**
 * Whether AirTags show players on this map: only a red map lets them attack.
 * Members still report players elsewhere, so timers count enemies on every
 * map.
 */
export const showsAirTagsOnMap = (): boolean =>
  useGameStore.getState().game?.map.pvp === FULL_PVP_MAP;
