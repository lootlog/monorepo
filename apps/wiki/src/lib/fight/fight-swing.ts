import { armorAgainst, armorReduced } from "./fight-defence";
import { chance, weakeningFactor } from "./fight-hit-effects";
import {
  isImmune,
  MELEE,
  randomPick,
  roll,
  takeDamage,
  type FighterState,
} from "./fight-state";

const SWING_TARGETS = 3;

export type SwingHit = { readonly target: number; readonly damage: number };

export const swingAt = (
  attacker: FighterState,
  others: readonly FighterState[],
  random: () => number,
) => {
  const a = attacker.combatant;

  const targets = randomPick(
    others.filter((other) => other.alive),
    SWING_TARGETS,
    random,
  );

  return targets.map((other) => {
    const damage = isImmune(other)
      ? 0
      : Math.round(
          armorReduced(
            roll(random, a.physical) * weakeningFactor(attacker, other),
            armorAgainst(other, attacker),
          ),
        );

    takeDamage(other, damage);
    attacker.damageDealt += damage;

    return { target: other.index, damage };
  });
};

export const swingsAround = (
  attacker: FighterState,
  defender: FighterState,
  random: () => number,
) =>
  defender.alive &&
  MELEE.has(attacker.combatant.profession) &&
  chance(random, attacker.combatant.swingChance);
