import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";

export type WarriorLegendaryBonuses = {
  id: string;
  battleWarriorId: string;
  curse: number;
  cleanse: number;
  lastheal: number;
  lasthealValue: number;
  glare: number;
  holytouch: number;
  critred: number;
  facade: number;
  verycrit: number;
};

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
  damageDealtAfterDefensive: number;
  damageTaken: number;
  rageDamageDealt: number;
  trueDamageDealt: number;
  trueDamageTaken: number;
  passiveHealing: number;
  activeHealing: number;
  armorPierces: number;
  criticalHits: number;
  reducedArmor: number;
  reducedPoisonResistance: number;
  evasions: number;
  fastArrows: number;
  blocks: number;
  blockedDamage: number;
  woundDamageTaken: number;
  poisonDamageTaken: number;
  injureDamageTaken: number;
  critWoundDamageTaken: number;
  firePassiveDamageTaken: number;
  lightningPassiveDamageTaken: number;
  destroyedEnergy: number;
  destroyedMana: number;
  regeneratedEnergy: number;
  reflectedDamage: number;
  reflectedDamageTaken: number;
  legendaryBonuses: WarriorLegendaryBonuses;
  damageDealtAfterDefensivePercentage: number;
  isDead: boolean;
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
  warriors: Warrior[];
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

export const useBattles = () => {
  const { client } = useBattleLogApiClient();

  const query = useQuery({
    queryKey: ["battles", "@me"],
    queryFn: () => client.get<GetBattlesResponse>(`/battles/@me`),
    select: (response) => response.data,
  });

  return query;
};
