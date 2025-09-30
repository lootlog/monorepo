export type SharedLegendaryBonuses = {
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

export type SharedWarrior = {
  id: string;
  originalId: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  team: number;
  isDead: boolean;
  turns: number;
  damageDealt: number;
  damageDealtAfterDefensive: number;
  damageDealtAfterDefensivePercentage: number;
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
  legendaryBonuses: SharedLegendaryBonuses;
};

export type SharedBattleData = {
  id: string;
  duration: number;
  type: string;
  winner: string;
  loser: string;
  winningTeam: number;
  losingTeam: number;
  characterId: string;
  warriors: SharedWarrior[];
};

export type SharedRawBattleData = {
  events: Array<{
    attackerId: string | null;
    defenderId: string | null;
    attackerHpPercentage: number | null;
    defenderHpPercentage: number | null;
    actions: Array<{ actionType: string; param: string }>;
  }>;
  accountId: string;
  characterId: string;
  world: string;
};