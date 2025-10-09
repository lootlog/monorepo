import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";

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
};

export type GetBattlesResponse = {
  battles: Battle[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta: {
    strategy: string;
    performance: {
      queryTime: number;
      countTime: number;
      totalItems: number;
      estimatedTotal: boolean;
    };
  };
};

export type UseBattlesParams = {
  page?: number;
  limit?: number;
  world?: string;
  type?: string;
  search?: string;
};

export const useBattles = (params?: UseBattlesParams) => {
  const { client } = useBattleLogApiClient();
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const query = useQuery({
    queryKey: ["battles", "@me", params],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (params?.world) searchParams.append("world", params.world);
      if (params?.type) searchParams.append("type", params.type);
      if (params?.search) searchParams.append("search", params.search);

      return client.get<GetBattlesResponse>(`/battles/@me?${searchParams}`);
    },
    select: (response) => response.data,
  });

  return query;
};
