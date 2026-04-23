export type SearchFacetDistribution = Record<string, Record<string, number>>;

export type SearchFacetStats = Record<
  string,
  {
    min: number;
    max: number;
  }
>;

export type ItemHit = {
  id: number;
  hid: string;
  name: string;
  icon: string;
  stat: string;
  stats: Record<string, string | number | boolean | string[]>;
  numericStats: Record<string, number>;
  statsKeys: string[];
  requiredProfessions: string[];
  lvl: number;
  rarity: string | null;
  type: string | null;
  world: string;
};

export type SearchItemsResponse = {
  hits: ItemHit[];
  estimatedTotalHits: number;
  facetDistribution: SearchFacetDistribution;
  facetStats: SearchFacetStats;
};

export type NpcHit = {
  id: number;
  prof: string;
  icon: string;
  name: string;
  lvl: number;
  wt: number;
  type: string;
  margonemType: number;
  world: string;
};

export type PlayerHit = {
  id: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  characterId: number;
  accountId: number;
  world: string;
};
