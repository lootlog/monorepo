import { critChances } from "./fight-crit";
import { blockChance, evadeChance, evadeParts } from "./fight-defence";
import { parryChance } from "./fight-hit-effects";
import { arrowBlockChance } from "./fight-passives";
import type { ActionPlan } from "./fight-skills";
import type { FighterState } from "./fight-state";
import { pierceChance } from "./fight-strike";

export type EvadeChance = {
  readonly chance: number;
  readonly points: number;
  readonly adrenaline: number;
  readonly reduction: number;
};

export type StrikeChances = {
  readonly evade: EvadeChance | null;
  readonly parry: number;
  readonly arrowBlock: number;
  readonly block: number;
  readonly crit: number;
  readonly veryCrit: number;
  readonly offhandCrit: number | null;
  readonly pierce: number;
  readonly pierceBlock: number;
  readonly counter: number;
};

const percent = (share: number) => share * 100;

export const strikeChances = (
  attacker: FighterState,
  defender: FighterState,
  plan: ActionPlan,
): StrikeChances => {
  const a = attacker.combatant;
  const d = defender.combatant;
  const evadeReduction = plan.effect("active_decevade_per");
  const evade = evadeParts(defender, attacker);
  const main = critChances(attacker, defender, a.critChance);

  return {
    evade: evade && {
      ...evade,
      reduction: evadeReduction,
      chance: percent(evadeChance(defender, attacker, evadeReduction)),
    },
    parry: parryChance(attacker, defender),
    arrowBlock: arrowBlockChance(attacker, defender),
    block: percent(
      blockChance(defender, attacker, plan.effect("active_decblock_per")),
    ),
    crit: main.crit,
    veryCrit: main.veryCrit,
    offhandCrit:
      a.offhand.max > 0
        ? critChances(attacker, defender, a.offhandCritChance).crit
        : null,
    pierce: pierceChance(attacker),
    pierceBlock: d.pierceBlock,
    counter: defender.stunned ? 0 : d.counterChance,
  };
};
