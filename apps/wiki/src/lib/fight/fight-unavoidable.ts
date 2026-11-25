import { unavoidableFactor } from "./fight-hit-effects";
import type { FighterState } from "./fight-state";

const TAKEN_DAMAGE_SOURCES = 2;

type ExtraHit = { readonly strength: number; readonly taken: number };

const shareOf = (strength: number, percent: number) =>
  Math.round((strength * percent) / 100);

const strongestTakenDamage = (defender: FighterState) =>
  defender.buffs
    .filter(
      (buff) =>
        buff.key === "taken_dmg_per" || buff.key === "taken_dmg_per-all",
    )
    .map((buff) => buff.value)
    .sort((left, right) => right - left)
    .slice(0, TAKEN_DAMAGE_SOURCES)
    .reduce((total, value) => total + value, 0);

export const takenDamageBonus = (
  defender: FighterState,
  mainStrengths: readonly number[],
  extraHits: readonly ExtraHit[],
  missed: boolean,
) => {
  const percent = strongestTakenDamage(defender);
  const landed = extraHits.filter((hit) => hit.taken > 0);

  if (percent <= 0 || (missed && landed.length === 0)) return 0;

  return [...mainStrengths, ...landed.map((hit) => hit.strength)].reduce(
    (total, strength) => total + shareOf(strength, percent),
    0,
  );
};

export const unavoidableDamage = (attacker: FighterState, damage: number) =>
  Math.floor(damage * unavoidableFactor(attacker));
