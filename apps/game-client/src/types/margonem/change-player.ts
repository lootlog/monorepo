export type ChangePlayerCharacter = {
  icon: string;
  id: number;
  lvl: number;
  nick: string;
  prof: string;
  world: string;
  last: number;
  clan: number;
  clan_rank: number;
};

export type ChangePlayer = {
  list: ChangePlayerCharacter[];
};
