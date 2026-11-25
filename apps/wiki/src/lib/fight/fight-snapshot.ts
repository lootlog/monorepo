import {
  currentArmor,
  elementResistance,
  resistanceReduction,
} from "./fight-defence";
import { attackTime } from "./fight-simulator";
import { buffTotal } from "./fight-skills";
import { MAX_RESISTANCE } from "@/lib/character-stats";
import { clamp, type FighterState } from "./fight-state";

type ConditionId =
  | "stunned"
  | "cursed"
  | "poison"
  | "wound"
  | "injure"
  | "critWound"
  | "anguish"
  | "fire"
  | "light"
  | "absolute"
  | "frostSlow"
  | "critSlow"
  | "enemySlow"
  | "healingCut"
  | "holyTouch";

export type FighterCondition = {
  readonly id: ConditionId;
  readonly value: number;
  readonly turns: number | null;
  readonly source: number | null;
};

export type FighterBuff = {
  readonly key: string;
  readonly value: number;
  readonly turns: number | null;
  readonly source: number;
};

export type NextAction =
  | { readonly kind: "skill"; readonly name: string }
  | { readonly kind: "attack" | "step" };

export type FighterSnapshot = {
  readonly hp: number;
  readonly maxHp: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly mana: number;
  readonly maxMana: number;
  readonly combo: number;
  readonly absorb: number;
  readonly maxAbsorb: number;
  readonly absorbMagic: number;
  readonly maxAbsorbMagic: number;
  readonly armor: number;
  readonly baseArmor: number;
  readonly resistances: {
    readonly fire: number;
    readonly frost: number;
    readonly light: number;
    readonly poison: number;
  };
  readonly attackSpeed: number;
  readonly stepsForward: number;
  readonly buffs: readonly FighterBuff[];
  readonly conditions: readonly FighterCondition[];
  readonly cooldowns: readonly {
    readonly name: string;
    readonly turns: number;
  }[];
  readonly nextAction: NextAction;
};

const finite = (turns: number) => (Number.isFinite(turns) ? turns : null);

const lasting = (
  id: ConditionId,
  effect: { damage: number; turnsLeft: number } | null | undefined,
): FighterCondition[] =>
  effect
    ? [
        {
          id,
          value: Math.round(effect.damage),
          turns: effect.turnsLeft,
          source: null,
        },
      ]
    : [];

const conditionsOf = (state: FighterState): FighterCondition[] => [
  ...(state.stunned
    ? [{ id: "stunned" as const, value: 0, turns: 1, source: null }]
    : []),
  ...(state.cursed
    ? [{ id: "cursed" as const, value: 0, turns: 1, source: null }]
    : []),
  ...lasting("poison", state.poison),
  ...lasting("wound", state.wound),
  ...lasting("injure", state.injure),
  ...lasting("critWound", state.critWound),
  ...lasting("anguish", state.anguish),
  ...lasting("fire", state.skillDots.get("fire")),
  ...lasting("light", state.skillDots.get("light")),
  ...lasting("absolute", state.skillDots.get("absolute")),
  ...(state.frostSlow
    ? [
        {
          id: "frostSlow" as const,
          value: state.frostSlow.slow,
          turns: state.frostSlow.turnsLeft,
          source: null,
        },
      ]
    : []),
  ...(state.critSlowTurns > 0
    ? [
        {
          id: "critSlow" as const,
          value: state.critSlowValue,
          turns: state.critSlowTurns,
          source: null,
        },
      ]
    : []),
  ...[...state.slowBySource].map(([source, value]) => ({
    id: "enemySlow" as const,
    value,
    turns: null,
    source,
  })),
  ...(state.enemyHealingCut
    ? [
        {
          id: "healingCut" as const,
          value: state.enemyHealingCut.amount,
          turns: state.enemyHealingCut.turnsLeft,
          source: null,
        },
      ]
    : []),
  ...(state.holyTouchTurns > 0
    ? [
        {
          id: "holyTouch" as const,
          value: 0,
          turns: state.holyTouchTurns,
          source: null,
        },
      ]
    : []),
];

const ATTACK: NextAction = { kind: "attack" };

const nextActionOf = (state: FighterState): NextAction => {
  const { steps, repeat } = state.combatant.mastery;

  if (steps.length === 0 || (!repeat && state.masteryCursor >= steps.length))
    return ATTACK;

  const step = steps[state.masteryCursor % steps.length] ?? null;

  if (step === null) return ATTACK;

  if (step === "attack" || step === "step") return { kind: step };

  return { kind: "skill", name: step.name };
};

const percentOf = (share: number) => Math.round(share * 100);

export const snapshotFighter = (state: FighterState): FighterSnapshot => {
  const c = state.combatant;

  return {
    hp: state.hp,
    maxHp: c.hp,
    energy: Math.round(state.energy),
    maxEnergy: c.energy,
    mana: Math.round(state.mana),
    maxMana: c.mana,
    combo: state.comboPoints,
    absorb: Math.round(state.absorbLeft),
    maxAbsorb: c.absorb,
    absorbMagic: Math.round(state.absorbMagicLeft),
    maxAbsorbMagic: c.absorbMagic,
    armor: Math.round(currentArmor(state)),
    baseArmor: c.armor,
    resistances: {
      fire: percentOf(resistanceReduction(elementResistance(state, "fire"))),
      frost: percentOf(resistanceReduction(elementResistance(state, "frost"))),
      light: percentOf(resistanceReduction(elementResistance(state, "light"))),
      poison: clamp(
        c.resistPoison -
          state.poisonResistanceLost +
          buffTotal(state, "antidote"),
        0,
        MAX_RESISTANCE,
      ),
    },
    attackSpeed: 1 / attackTime(state),
    stepsForward: state.stepsForward,
    buffs: state.buffs.map((buff) => ({
      key: buff.key,
      value: buff.value,
      turns: finite(buff.turnsLeft),
      source: buff.source,
    })),
    conditions: conditionsOf(state),
    cooldowns: [...state.cooldowns].flatMap(([skill, value]) => {
      const turns = state.castThisTurn === skill ? value - 1 : value;

      return turns > 0 ? [{ name: skill.name, turns }] : [];
    }),
    nextAction: nextActionOf(state),
  };
};
