import type { BattleWarriorSnapshot } from "./battle-log.js";

/** One warrior's combat totals. Battlelog persists every field. */
export type Warrior = {
  turns: number;
  turnsLost: number;
  steps: number;
  normalAttacks: number;
  spellsUsed: number;
  spellsUsedMap: Record<string, number>;
  originalId: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  team: number;
  isDead: boolean;
  surrendered: boolean;
  fled: boolean;
  maxHp: number;
  damageDealt: number;
  distanceDamage: number;
  meleeDamage: number;
  auxiliaryDamage: number;
  fireDamage: number;
  frostDamage: number;
  lightningDamage: number;
  thirdAttDamage: number;
  damageDealtAfterDefensive: number;
  damageDealtAfterDefensivePercentage: number;
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
  stigmaDamageDealt: number;
  stigmaDamageTaken: number;
  passiveHealing: number;
  activeHealing: number;
  armorPierces: number;
  criticalHits: number;
  reducedArmor: number;
  reducedPoisonResistance: number;
  magicResistanceDestroyed: number;
  woundDamageTaken: number;
  poisonDamageTaken: number;
  injureDamageTaken: number;
  injures: number;
  critWoundDamageTaken: number;
  evasions: number;
  attacksEvaded: number;
  counters: number;
  fastArrows: number;
  firePassiveDamageTaken: number;
  lightningPassiveDamageTaken: number;
  destroyedEnergy: number;
  destroyedMana: number;
  blockedDamage: number;
  blocks: number;
  attacksBlocked: number;
  regeneratedEnergy: number;
  regeneratedMana: number;
  reflectedDamage: number;
  reflectedDamageTaken: number;
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
  legbonAnguishDamageTaken: number;
  legbonPunctureValue: number;
  ph: number;
};

export type NumericWarriorStat = {
  [Key in keyof Warrior]: Warrior[Key] extends number ? Key : never;
}[keyof Warrior];

type LegendaryTotalStat =
  | "legbonCurse"
  | "legbonCleanse"
  | "legbonLastheal"
  | "legbonGlare"
  | "legbonHolytouch"
  | "legbonVerycrit"
  | "legbonAnguish";

export type LegendaryTotalWarrior = Pick<Warrior, LegendaryTotalStat>;

/** Counts the legendary bonuses that trigger; value-only bonuses are excluded. */
export const getLegendaryTotal = (w: LegendaryTotalWarrior): number =>
  w.legbonCurse +
  w.legbonCleanse +
  w.legbonLastheal +
  w.legbonGlare +
  w.legbonHolytouch +
  w.legbonVerycrit +
  w.legbonAnguish;

const createWarrior = (data: BattleWarriorSnapshot): Warrior => ({
  turns: 0,
  turnsLost: 0,
  steps: 0,
  normalAttacks: 0,
  spellsUsed: 0,
  spellsUsedMap: {},
  originalId: data.originalId.toString(),
  name: data.name,
  lvl: data.lvl,
  prof: data.prof,
  icon: data.icon,
  team: data.team,
  isDead: false,
  surrendered: false,
  fled: false,
  maxHp: 0,
  damageDealt: 0,
  distanceDamage: 0,
  meleeDamage: 0,
  auxiliaryDamage: 0,
  fireDamage: 0,
  frostDamage: 0,
  lightningDamage: 0,
  thirdAttDamage: 0,
  damageDealtAfterDefensive: 0,
  damageDealtAfterDefensivePercentage: 0,
  damageTaken: 0,
  distanceDamageTaken: 0,
  meleeDamageTaken: 0,
  auxiliaryDamageTaken: 0,
  fireDamageTaken: 0,
  frostDamageTaken: 0,
  lightningDamageTaken: 0,
  thirdAttDamageTaken: 0,
  flatDamageTaken: 0,
  rageDamageDealt: 0,
  trueDamageDealt: 0,
  trueDamageTaken: 0,
  stigmaDamageDealt: 0,
  stigmaDamageTaken: 0,
  passiveHealing: 0,
  activeHealing: 0,
  armorPierces: 0,
  criticalHits: 0,
  reducedArmor: 0,
  reducedPoisonResistance: 0,
  magicResistanceDestroyed: 0,
  woundDamageTaken: 0,
  legbonAnguishDamageTaken: 0,
  poisonDamageTaken: 0,
  injureDamageTaken: 0,
  injures: 0,
  critWoundDamageTaken: 0,
  evasions: 0,
  attacksEvaded: 0,
  counters: 0,
  fastArrows: 0,
  firePassiveDamageTaken: 0,
  lightningPassiveDamageTaken: 0,
  destroyedEnergy: 0,
  destroyedMana: 0,
  blockedDamage: 0,
  blocks: 0,
  attacksBlocked: 0,
  regeneratedEnergy: 0,
  regeneratedMana: 0,
  reflectedDamage: 0,
  reflectedDamageTaken: 0,
  legbonCurse: 0,
  legbonCleanse: 0,
  legbonLastheal: 0,
  legbonLasthealValue: 0,
  legbonGlare: 0,
  legbonHolytouch: 0,
  legbonHolytouchValue: 0,
  legbonCritredValue: 0,
  legbonFacadeValue: 0,
  legbonVerycrit: 0,
  legbonAnguish: 0,
  legbonPunctureValue: 0,
  legbons: 0,
  ph: 0,
});

export const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Warriors keyed by battle id, looked up by the names the log prints. */
export class WarriorRoster {
  readonly byId = new Map<string, Warrior>();

  add(id: string, snapshot: BattleWarriorSnapshot): void {
    if (!this.byId.has(id)) this.byId.set(id, createWarrior(snapshot));
  }

  get(id: string | null): Warrior | null {
    return id ? (this.byId.get(id) ?? null) : null;
  }

  /** Matches names ignoring case and Polish diacritics. */
  findIdByName(name: string): string | null {
    const normalizedName = normalizeName(name);

    for (const [id, warrior] of this.byId) {
      if (normalizeName(warrior.name) === normalizedName) return id;
    }

    return null;
  }

  findByName(name: string): Warrior | null {
    return this.get(this.findIdByName(name));
  }
}
