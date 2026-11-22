export type Map = {
  d: GameMap;
};

export type GameMap = {
  visibility: number;
  pvp?: number;
  name: string;
  id: number;
};
