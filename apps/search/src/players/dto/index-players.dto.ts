export type IndexPlayersDto = {
  players: {
    id: string;
    name: string;
    lvl: number;
    prof: string;
    icon: string;
    characterId: number;
    accountId: number;
  }[];
};
