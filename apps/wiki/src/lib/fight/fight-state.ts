import {
  hasBuff,
  type ComboGain,
  type MasteryQueue,
  type SkillUserState,
} from "./fight-skills";

export type Profession = "h" | "w" | "p" | "b" | "m" | "t";

export type DamageRange = { readonly min: number; readonly max: number };

export type LegendaryBonuses = {
  readonly verycrit: number;
  readonly holytouch: number;
  readonly curse: number;
  readonly glare: number;
  readonly critred: number;
  readonly facade: number;
  readonly cleanse: number;
  readonly puncture: number;
  readonly anguish: { readonly chance: number; readonly damage: number };
  readonly lastheal: DamageRange | null;
};

export const NO_LEGENDARY_BONUSES: LegendaryBonuses = {
  verycrit: 0,
  holytouch: 0,
  curse: 0,
  glare: 0,
  critred: 0,
  facade: 0,
  cleanse: 0,
  puncture: 0,
  anguish: { chance: 0, damage: 0 },
  lastheal: null,
};

export type Combatant = {
  readonly name: string;
  readonly profession: Profession;
  readonly level: number;
  readonly hp: number;
  readonly physical: DamageRange;
  readonly offhand: DamageRange;
  readonly fire: DamageRange;
  readonly frost: DamageRange;
  readonly frostSlow: number;
  readonly light: DamageRange;
  readonly poison: { readonly damage: number; readonly slow: number };
  readonly wound: { readonly chance: number; readonly damage: number };
  readonly attackSpeed: number;
  readonly critChance: number;
  readonly critValue: number;
  readonly critMagicValue: number;
  readonly critReduction: number;
  readonly pierce: number;
  readonly pierceBlock: number;
  readonly armor: number;
  readonly shieldArmor: number;
  readonly armorDestruction: number;
  readonly evadePoints: number;
  readonly evadeReduction: number;
  readonly blockPoints: number;
  readonly absorb: number;
  readonly absorbMagic: number;
  readonly resistFire: number;
  readonly resistFrost: number;
  readonly resistLight: number;
  readonly resistPoison: number;
  readonly resistWound: number;
  readonly healing: number;
  readonly healingReduction: number;
  readonly energy: number;
  readonly energyGain: number;
  readonly mana: number;
  readonly physicalBonus: number;
  readonly damageBonus: number;
  readonly damageTakenBonus: number;
  readonly enemySlow: number;
  readonly slowReduction: number;
  readonly stunReduction: number;
  readonly counterChance: number;
  readonly parryChance: number;
  readonly parryCounterChance: number;
  readonly rageTurns: number;
  readonly rageBonus: number;
  readonly armorDestructionReduction: number;
  readonly fastArrowChance: number;
  readonly critSlow: number;
  readonly comboGain: ComboGain;
  readonly mastery: MasteryQueue;
  readonly legendary: LegendaryBonuses;
};

export const MAX_RESISTANCE = 90;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type DamageOverTime = { damage: number; turnsLeft: number };

type Wound = DamageOverTime & { cap: number };

type Poison = DamageOverTime & { slow: number };

type FrostSlow = { slow: number; boost: number; turnsLeft: number };

type SkillDamageOverTime = "fire" | "light" | "absolute";

export type FighterState = SkillUserState & {
  index: number;
  team: number;
  combatant: Combatant;
  hp: number;
  alive: boolean;
  clock: number;
  armorLost: number;
  absorbLeft: number;
  absorbMagicLeft: number;
  healTriggers: number;
  poison: Poison | null;
  wound: Wound | null;
  anguish: DamageOverTime | null;
  skillDots: Map<SkillDamageOverTime, DamageOverTime>;
  frostSlow: FrostSlow | null;
  stunned: boolean;
  holyTouchTurns: number;
  lastHealUsed: boolean;
  turnLost: boolean;
  slowBySource: Map<number, number>;
  critSlowTurns: number;
  critSlowValue: number;
  lightAttacks: Map<number, number>;
  moves: number;
  damageDealt: number;
  hits: number;
  crits: number;
  evaded: number;
  pierced: number;
  healed: number;
};

export const createState = (
  combatant: Combatant,
  team: number,
  index: number,
): FighterState => ({
  index,
  team,
  combatant,
  hp: combatant.hp,
  alive: true,
  clock: 0,
  energy: combatant.energy,
  mana: combatant.mana,
  armorLost: 0,
  absorbLeft: combatant.absorb,
  absorbMagicLeft: combatant.absorbMagic,
  healTriggers: 0,
  energyRestores: 0,
  healUses: new Map(),
  previousSkill: null,
  castThisTurn: null,
  comboPoints: 0,
  masteryCursor: 0,
  cooldowns: new Map(),
  buffs: [],
  poison: null,
  wound: null,
  anguish: null,
  skillDots: new Map(),
  frostSlow: null,
  stunned: false,
  holyTouchTurns: 0,
  lastHealUsed: false,
  turnLost: false,
  slowBySource: new Map(),
  critSlowTurns: 0,
  critSlowValue: 0,
  lightAttacks: new Map(),
  moves: 0,
  damageDealt: 0,
  hits: 0,
  crits: 0,
  evaded: 0,
  pierced: 0,
  healed: 0,
  skillUses: new Map(),
});

export const MELEE: ReadonlySet<Profession> = new Set(["w", "p", "b"]);

export const isImmune = (state: FighterState) =>
  hasBuff(state, "immunity_to_dmg");

export const takeDamage = (state: FighterState, amount: number) => {
  state.hp -= amount;

  if (state.hp < 1) {
    state.alive = false;
    state.hp = 0;
  }
};

export const healBy = (state: FighterState, amount: number) => {
  if (!state.alive) return 0;

  const healed = Math.max(
    0,
    Math.min(state.combatant.hp - state.hp, Math.round(amount)),
  );

  state.hp += healed;
  state.healed += healed;

  return healed;
};
