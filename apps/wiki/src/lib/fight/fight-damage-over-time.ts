import { MAX_RESISTANCE } from "@/lib/character-stats";
import { elementResistance, resistanceReduction } from "./fight-defence";
import type { DamageOverTimeKind, DamageTick } from "./fight-events";
import { poisonWeakeningOf } from "./fight-hit-effects";
import { buffTotal } from "./fight-skills";
import {
  clamp,
  isImmune,
  type DamageOverTime,
  type FighterState,
  type SkillDamageOverTime,
} from "./fight-state";

const DOT_WEAKENING_SOURCES = 2;

type PendingTick = {
  readonly kind: DamageOverTimeKind;
  readonly dot: DamageOverTime;
  readonly resistance: number;
  readonly poisonWeakens: boolean;
  readonly expire: () => void;
};

const pendingTicks = (state: FighterState): PendingTick[] => {
  const poisonResistance = clamp(
    Math.max(0, state.combatant.resistPoison - state.poisonResistanceLost) +
      buffTotal(state, "antidote"),
    0,
    MAX_RESISTANCE,
  );

  const woundResistance = clamp(state.combatant.resistWound, 0, MAX_RESISTANCE);

  const skillDot = (
    kind: SkillDamageOverTime,
    resistance: number,
  ): PendingTick[] => {
    const dot = state.skillDots.get(kind);

    return dot
      ? [
          {
            kind,
            dot,
            resistance,
            poisonWeakens: true,
            expire: () => state.skillDots.delete(kind),
          },
        ]
      : [];
  };

  return [
    ...(state.wound
      ? [
          {
            kind: "wound" as const,
            dot: state.wound,
            resistance: woundResistance,
            poisonWeakens: true,
            expire: () => (state.wound = null),
          },
        ]
      : []),
    ...(state.anguish
      ? [
          {
            kind: "anguish" as const,
            dot: state.anguish,
            resistance: 0,
            poisonWeakens: true,
            expire: () => (state.anguish = null),
          },
        ]
      : []),
    ...(state.injure
      ? [
          {
            kind: "injure" as const,
            dot: state.injure,
            resistance: woundResistance,
            poisonWeakens: false,
            expire: () => (state.injure = null),
          },
        ]
      : []),
    ...(state.critWound
      ? [
          {
            kind: "critwound" as const,
            dot: state.critWound,
            resistance: woundResistance,
            poisonWeakens: false,
            expire: () => (state.critWound = null),
          },
        ]
      : []),
    ...(state.poison
      ? [
          {
            kind: "poison" as const,
            dot: state.poison,
            resistance: poisonResistance,
            poisonWeakens: true,
            expire: () => (state.poison = null),
          },
        ]
      : []),
    ...skillDot(
      "fire",
      100 * resistanceReduction(elementResistance(state, "fire")),
    ),
    ...skillDot(
      "light",
      100 * resistanceReduction(elementResistance(state, "light")),
    ),
    ...skillDot("absolute", 0),
  ];
};

export const tickDamageOverTime = (
  state: FighterState,
  states: readonly FighterState[],
): DamageTick[] => {
  const immune = isImmune(state);

  return pendingTicks(state).map(
    ({ kind, dot, resistance, poisonWeakens, expire }) => {
      dot.turnsLeft -= 1;

      if (dot.turnsLeft <= 0) expire();

      const source = states[dot.source];

      const poisonWeakening =
        poisonWeakens && source ? poisonWeakeningOf(source) : 0;

      const allWeakening =
        poisonWeakens && source ? buffTotal(source, "alllowdmg") : 0;

      const weakening =
        [poisonWeakening, -state.combatant.damageTakenBonus]
          .filter((value) => value > 0)
          .sort((left, right) => right - left)
          .slice(0, DOT_WEAKENING_SOURCES)
          .reduce((total, value) => total + value, 0) + allWeakening;

      return {
        kind,
        damage: immune
          ? 0
          : Math.round(
              dot.damage *
                Math.max(0, 1 - weakening / 100) *
                (1 - resistance / 100),
            ),
        reduction: Math.round(resistance),
        poisonWeakening,
      };
    },
  );
};
