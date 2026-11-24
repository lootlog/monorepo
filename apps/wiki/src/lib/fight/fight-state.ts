import type { ActiveSkill, ComboGain, SkillUserState } from "./fight-skills";

export type Profession = "h" | "w" | "p" | "b" | "m" | "t";

export type DamageRange = { readonly min: number; readonly max: number };

export type Combatant = {
  readonly name: string;
  readonly profession: Profession;
  readonly level: number;
  readonly hp: number;
  readonly physical: DamageRange;
  readonly offhand: DamageRange;
  readonly fire: DamageRange;
  readonly frost: DamageRange;
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
  readonly fastArrowChance: number;
  readonly critSlow: number;
  readonly comboGain: ComboGain;
  readonly actives: readonly ActiveSkill[];
};

export const MAX_RESISTANCE = 90;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type DamageOverTime = { damage: number; turnsLeft: number };

type Wound = DamageOverTime & { cap: number };

type Poison = DamageOverTime & { slow: number };

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
  comboPoints: 0,
  cooldowns: new Map(),
  buffs: [],
  poison: null,
  wound: null,
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
