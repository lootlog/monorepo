import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";

const FULL_PVP_MAP = 2;

type TilePosition = { readonly x: number; readonly y: number };

const AIR_TAG_SIGHT_LAG_TILES = 1;

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

export const isSeenByHero = (target: {
  readonly targetId: string;
  readonly x: number;
  readonly y: number;
}): boolean =>
  target.targetId === useGameStore.getState().game?.hero.characterId ||
  useOthersStore.getState().othersById[target.targetId] !== undefined ||
  isInHeroSight(target, AIR_TAG_SIGHT_LAG_TILES);

export const showsAirTagsOnMap = (): boolean =>
  useGameStore.getState().game?.map.pvp === FULL_PVP_MAP;
