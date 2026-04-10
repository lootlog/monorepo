import { queryOptions, useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import {
  battlelogApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

export type Warrior = {
  id: string;
  battleId: string;
  originalId: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  team: number;
  turns: number;
  damageDealt: number;
  distanceDamage: number;
  meleeDamage: number;
  auxiliaryDamage: number;
  fireDamage: number;
  frostDamage: number;
  lightningDamage: number;
  thirdAttDamage: number;
  damageDealtAfterDefensive: number;
  damageTaken: number;
  distanceDamageTaken: number;
  meleeDamageTaken: number;
  auxiliaryDamageTaken: number;
  fireDamageTaken: number;
  frostDamageTaken: number;
  lightningDamageTaken: number;
  thirdAttDamageTaken: number;
  flatDamageTaken: number;
  rageDamageDealt: number;
  trueDamageDealt: number;
  trueDamageTaken: number;
  passiveHealing: number;
  activeHealing: number;
  armorPierces: number;
  criticalHits: number;
  reducedArmor: number;
  reducedPoisonResistance: number;
  magicResistanceDestroyed: number;
  evasions: number;
  counters: number;
  fastArrows: number;
  blocks: number;
  blockedDamage: number;
  woundDamageTaken: number;
  poisonDamageTaken: number;
  injureDamageTaken: number;
  injures: number;
  critWoundDamageTaken: number;
  firePassiveDamageTaken: number;
  lightningPassiveDamageTaken: number;
  destroyedEnergy: number;
  destroyedMana: number;
  regeneratedEnergy: number;
  reflectedDamage: number;
  reflectedDamageTaken: number;
  damageDealtAfterDefensivePercentage: number;
  isDead: boolean;
  surrendered: boolean;
  fled: boolean;
  spellsUsed: number;
  spellsUsedMap: Record<string, number>;
  normalAttacks: number;
  steps: number;
  turnsLost: number;
  legbons: number;
  legbonCurse: number;
  legbonCleanse: number;
  legbonLastheal: number;
  legbonLasthealValue: number;
  legbonGlare: number;
  legbonHolytouch: number;
  legbonHolytouchValue: number;
  legbonCritredValue: number;
  legbonFacadeValue: number;
  legbonVerycrit: number;
  legbonAnguish: number;
  legbonPunctureValue: number;
  legbonAnguishDamageTaken: number;
  stigmaDamageDealt: number;
  stigmaDamageTaken: number;
  ph: number;
};

export type Battle = {
  id: string;
  createdAt: string;
  updatedAt: string;
  public: boolean;
  userId: string;
  accountId: string;
  characterId: string;
  duration: number;
  type: string;
  winner: string;
  loser: string;
  winningTeam: number;
  losingTeam: number;
  hasFlee: boolean;
  warriors: Warrior[];
  world: string;
  matchmaking: boolean;
};

export type GetBattlesResponse = {
  battles: Battle[];
  pagination: {
    size: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    total?: number;
  };
  meta: {
    performance: {
      queryTime: number;
      countTime?: number;
      totalItems?: number;
      estimatedTotal?: boolean;
    };
  };
};

export type UseBattlesParams = {
  cursor?: string;
  size?: number;
  sortOrder?: "asc" | "desc";
  includeTotal?: boolean;
  world?: string;
  type?: Array<"solo" | "group">;
  search?: string;
  result?: Array<"won" | "lost" | "flee">;
  ph?: boolean;
  matchmaking?: boolean;
  characterId?: Array<string>;
  minLevel?: number;
  maxLevel?: number;
  suppressRouteErrorToast?: boolean;
};

const buildBattlesSearchParams = (params?: UseBattlesParams) => {
  const size = params?.size ?? 20;
  const sortOrder = params?.sortOrder ?? "desc";

  const searchParams = new URLSearchParams({
    size: size.toString(),
    sortOrder,
  });

  if (params?.cursor) searchParams.append("cursor", params.cursor);
  if (params?.includeTotal) searchParams.append("includeTotal", "true");
  if (params?.world) searchParams.append("world", params.world);
  if (params?.type && params.type.length > 0) {
    params.type.forEach((type) => searchParams.append("type", type));
  }
  if (params?.search) searchParams.append("search", params.search);
  if (params?.result && params.result.length > 0) {
    params.result.forEach((result) => searchParams.append("result", result));
  }
  if (params?.ph) searchParams.append("ph", "true");
  if (params?.matchmaking) searchParams.append("matchmaking", "true");
  if (params?.characterId && params.characterId.length > 0) {
    params.characterId.forEach((id) => searchParams.append("characterId", id));
  }
  if (params?.minLevel) {
    searchParams.append("minLevel", params.minLevel.toString());
  }
  if (params?.maxLevel) {
    searchParams.append("maxLevel", params.maxLevel.toString());
  }

  return searchParams;
};

export const battlesQueryOptions = (params?: UseBattlesParams) =>
  queryOptions({
    queryKey: queryKeys.battleLog.battlesList(
      params
        ? {
            ...params,
            suppressRouteErrorToast: undefined,
          }
        : undefined,
    ),
    queryFn: async () => {
      const searchParams = buildBattlesSearchParams(params);

      const response = await battlelogApiClient.get<GetBattlesResponse>(
        `/battles/@me?${searchParams}`,
        {
          suppressRouteErrorToast: params?.suppressRouteErrorToast ?? false,
        } as ApiRequestConfig,
      );
      return response;
    },
    staleTime: 1000 * 30,
  });

export const useBattles = (params?: UseBattlesParams) => {
  useBattleLogApiClient();

  return useQuery(battlesQueryOptions(params));
};
