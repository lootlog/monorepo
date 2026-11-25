import {
  hasBuff,
  type ComboGain,
  type MasteryQueue,
  type SkillUserState,
} from "./fight-skills";

export type Profession = "h" | "w" | "p" | "b" | "m" | "t";

export type DamageRange = { readonly min: number; readonly max: number };

export type BattlePosition = 1 | 2 | 3;

export type ResourceDrain = {
  readonly chance: number;
  readonly amount: number;
};

export type ElementalBonus = {
  readonly fire: number;
  readonly frost: number;
  readonly light: number;
};

export type BoundedEffect = {
  readonly value: number;
  readonly bound: number;
};

export type PassiveEffects = {
  readonly energyBack: number;
  readonly injureChance: number;
  readonly critWoundChance: number;
  readonly poisonWeakening: number;
  readonly poisonResistanceDestruction: number;
  readonly thirdAttackChance: number;
  readonly crush: BoundedEffect;
  readonly critSpeed: BoundedEffect;
  readonly critPoison: BoundedEffect;
  readonly enemyHealing: number;
  readonly allyHealing: number;
  readonly allyHealth: number;
  readonly vulture: number;
  readonly arrowBlockChance: number;
  readonly critRage: number;
  readonly critPierce: number;
  readonly distractChance: number;
  readonly lastCrit: BoundedEffect;
  readonly adrenalinEvade: BoundedEffect;
  readonly adrenalinSpeed: BoundedEffect;
  readonly adrenalinDrainReduction: BoundedEffect;
  readonly blockReduction: number;
  readonly manaGain: number;
};

const NO_BOUNDED_EFFECT: BoundedEffect = { value: 0, bound: 0 };

export const NO_PASSIVE_EFFECTS: PassiveEffects = {
  energyBack: 0,
  injureChance: 0,
  critWoundChance: 0,
  poisonWeakening: 0,
  poisonResistanceDestruction: 0,
  thirdAttackChance: 0,
  crush: NO_BOUNDED_EFFECT,
  critSpeed: NO_BOUNDED_EFFECT,
  critPoison: NO_BOUNDED_EFFECT,
  enemyHealing: 0,
  allyHealing: 0,
  allyHealth: 0,
  vulture: 0,
  arrowBlockChance: 0,
  critRage: 0,
  critPierce: 0,
  distractChance: 0,
  lastCrit: NO_BOUNDED_EFFECT,
  adrenalinEvade: NO_BOUNDED_EFFECT,
  adrenalinSpeed: NO_BOUNDED_EFFECT,
  adrenalinDrainReduction: NO_BOUNDED_EFFECT,
  blockReduction: 0,
  manaGain: 0,
};

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
  readonly position: BattlePosition;
  readonly hp: number;
  readonly physical: DamageRange;
  readonly offhand: DamageRange;
  readonly fire: DamageRange;
  readonly frost: DamageRange;
  readonly frostSlow: number;
  readonly light: DamageRange;
  readonly poison: { readonly damage: number; readonly slow: number };
  readonly wound: { readonly chance: number; readonly damage: number };
  readonly offhandPoison: { readonly damage: number; readonly slow: number };
  readonly offhandWound: { readonly chance: number; readonly damage: number };
  readonly attackSpeed: number;
  readonly critChance: number;
  readonly critValue: number;
  readonly critMagicValue: number;
  readonly critMagicBonus: ElementalBonus;
  readonly offhandCritChance: number;
  readonly offhandCritValue: number;
  readonly critReduction: number;
  readonly critValueReduction: number;
  readonly pierce: number;
  readonly pierceBlock: number;
  readonly armor: number;
  readonly shieldArmor: number;
  readonly hasShield: boolean;
  readonly armorDestruction: number;
  readonly armorDestructionResist: number;
  readonly evadePoints: number;
  readonly evadePercent: number;
  readonly evadeReduction: number;
  readonly evadeReductionPercent: number;
  readonly blockPoints: number;
  readonly blockPercent: number;
  readonly absorb: number;
  readonly absorbMagic: number;
  readonly absorbDistance: number;
  readonly absorbRenewal: number;
  readonly absorbDestruction: number;
  readonly absorbDestructionReduction: number;
  readonly resistanceDestruction: number;
  readonly energyDrain: ResourceDrain;
  readonly manaDrain: ResourceDrain;
  readonly drainReduction: number;
  readonly drainResist: { readonly mana: number; readonly energy: number };
  readonly swingChance: number;
  readonly resistFire: number;
  readonly resistFrost: number;
  readonly resistLight: number;
  readonly resistPoison: number;
  readonly resistWound: number;
  readonly healing: number;
  readonly enemyHealingCut: number;
  readonly energy: number;
  readonly energyGain: number;
  readonly mana: number;
  readonly allDamageBonus: number;
  readonly physicalBonus: number;
  readonly lightDamageBonus: number;
  readonly unavoidableBonus: number;
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
  readonly passives: PassiveEffects;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type Element = "fire" | "frost" | "light";

export type DamageOverTime = {
  damage: number;
  turnsLeft: number;
  source: number;
};

type Wound = DamageOverTime & { cap: number };

type Poison = DamageOverTime & { slow: number; boosted: boolean };

type FrostSlow = {
  source: number;
  slow: number;
  turnsLeft: number;
  boost: number;
  boostTurnsLeft: number;
};

export type SkillDamageOverTime = "fire" | "light" | "absolute";

export type FighterState = SkillUserState & {
  index: number;
  team: number;
  combatant: Combatant;
  levelAdvantage: boolean;
  hp: number;
  alive: boolean;
  clock: number;
  stepsForward: number;
  armorLost: number;
  resistanceLost: Record<Element, number>;
  absorbLeft: number;
  absorbMagicLeft: number;
  healTriggers: number;
  poison: Poison | null;
  wound: Wound | null;
  injure: DamageOverTime | null;
  critWound: DamageOverTime | null;
  poisonResistanceLost: number;
  healCut: number;
  enemyHealingCut: { amount: number; turnsLeft: number } | null;
  anguish: DamageOverTime | null;
  skillDots: Map<SkillDamageOverTime, DamageOverTime>;
  frostSlow: FrostSlow | null;
  stunned: boolean;
  holyTouchTurns: number;
  lastHealUsed: boolean;
  punctureShown: boolean;
  facadeShown: boolean;
  armorProtectionShownTo: Set<number>;
  cursed: boolean;
  slowBySource: Map<number, number>;
  critSlowTurns: number;
  critSlowValue: number;
  lightAttacks: Map<number, number>;
  moves: number;
  damageDealt: number;
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
  levelAdvantage: true,
  hp: combatant.hp,
  alive: true,
  clock: 0,
  stepsForward: 0,
  energy: combatant.energy,
  mana: combatant.mana,
  armorLost: 0,
  resistanceLost: { fire: 0, frost: 0, light: 0 },
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
  injure: null,
  critWound: null,
  poisonResistanceLost: 0,
  healCut: 0,
  enemyHealingCut: null,
  anguish: null,
  skillDots: new Map(),
  frostSlow: null,
  stunned: false,
  holyTouchTurns: 0,
  lastHealUsed: false,
  punctureShown: false,
  facadeShown: false,
  armorProtectionShownTo: new Set(),
  cursed: false,
  slowBySource: new Map(),
  critSlowTurns: 0,
  critSlowValue: 0,
  lightAttacks: new Map(),
  moves: 0,
  damageDealt: 0,
  healed: 0,
  skillUses: new Map(),
});

export const MELEE: ReadonlySet<Profession> = new Set(["w", "p", "b"]);

const FARTHEST_POSITION: BattlePosition = 3;

export const canStepForward = (state: FighterState) =>
  state.combatant.position === 1 && state.stepsForward < FARTHEST_POSITION - 1;

const MELEE_CONTACT_GAP = 0;

export const inMeleeContact = (left: FighterState, right: FighterState) =>
  left.combatant.position -
    1 -
    left.stepsForward +
    right.combatant.position -
    1 -
    right.stepsForward <=
  MELEE_CONTACT_GAP;

export const reaches = (attacker: FighterState, target: FighterState) =>
  attacker.combatant.position > 1 ||
  target.combatant.position - 1 <= attacker.stepsForward;

export const withAllyHealth = (
  teams: readonly (readonly Combatant[])[],
): readonly (readonly Combatant[])[] =>
  teams.map((team) => {
    const bonus = team.reduce(
      (total, member) => total + member.passives.allyHealth,
      0,
    );

    return bonus > 0
      ? team.map((member) => ({
          ...member,
          hp: Math.round(member.hp * (1 + bonus / 100)),
        }))
      : team;
  });

export const randomPick = <Item>(
  items: readonly Item[],
  count: number,
  random: () => number,
) => {
  const candidates = [...items];
  const picked: Item[] = [];

  while (picked.length < count && candidates.length > 0) {
    picked.push(
      ...candidates.splice(Math.floor(random() * candidates.length), 1),
    );
  }

  return picked;
};

export const roll = (random: () => number, range: DamageRange) =>
  range.max <= range.min
    ? range.min
    : range.min + Math.floor(random() * (range.max - range.min + 1));

export const healthShare = (state: FighterState) =>
  (100 * state.hp) / state.combatant.hp;

export const isBelow = (state: FighterState, { value, bound }: BoundedEffect) =>
  value > 0 && healthShare(state) < bound;

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
