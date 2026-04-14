import { stringify } from "qs";
import { filterEmptyValues } from "@/lib/stringify-query-params";

type LootsFilters = {
  npcs: string[];
  npcTypes: string[];
  rarities: string[];
  players: string[];
  npcLevelMin: string;
  npcLevelMax: string;
  itemLevelMin: string;
  itemLevelMax: string;
  playerLevelMin: string;
  playerLevelMax: string;
  search: string;
  hid: string;
  itemNames: string[];
};

type CreateLootsQueryStringOptions = {
  filters: LootsFilters;
  world?: string;
  limit?: number;
};

const getArrayParam = (values: string[]) => {
  return values.length > 0 ? values : undefined;
};

export const createLootsQueryString = ({
  filters,
  world,
  limit,
}: CreateLootsQueryStringOptions) => {
  return stringify(
    {
      limit,
      npcs: getArrayParam(filters.npcs),
      npcTypes: getArrayParam(filters.npcTypes),
      rarities: getArrayParam(filters.rarities),
      players: getArrayParam(filters.players),
      npcLevelMin: filters.npcLevelMin || undefined,
      npcLevelMax: filters.npcLevelMax || undefined,
      itemLevelMin: filters.itemLevelMin || undefined,
      itemLevelMax: filters.itemLevelMax || undefined,
      playerLevelMin: filters.playerLevelMin || undefined,
      playerLevelMax: filters.playerLevelMax || undefined,
      search: filters.search || undefined,
      hid: filters.hid || undefined,
      itemNames: getArrayParam(filters.itemNames),
      world,
    },
    {
      arrayFormat: "comma",
      allowEmptyArrays: false,
      filter: filterEmptyValues,
    },
  );
};
