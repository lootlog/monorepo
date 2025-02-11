export class FetchLootsParamsDto {
  limit: number;
  cursor: number;
  npcs: string[];
  players: string[];
  rarities: string[];
  npcTypes: string[];
  world: string;
}
