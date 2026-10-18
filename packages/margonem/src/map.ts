export type Map = {
  d: GameMap;
};

export type GameMap = {
  visibility: number;
  /** 0 green, 1 yellow, 2 red (full PvP), 4 orange; see `Map.pvp`. */
  pvp?: number;
  name: string;
  id: number;
};
