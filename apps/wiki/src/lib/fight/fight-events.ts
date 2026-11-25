import type { CastOutcome } from "./fight-cast";
import type { StrikeChances } from "./fight-chances";
import type { ActiveSkill } from "./fight-skills";
import type { Combatant, FighterState } from "./fight-state";
import type { Strike } from "./fight-strike";

export type Targeting = "lowestLevel" | "random";

export type FightSetup = {
  readonly teams: readonly (readonly Combatant[])[];
  readonly targeting?: Targeting;
};

type FighterOutcome = {
  readonly name: string;
  readonly team: number;
  readonly alive: boolean;
  readonly hpLeft: number;
  readonly moves: number;
  readonly damageDealt: number;
  readonly healed: number;
  readonly skillUses: ReadonlyMap<string, number>;
};

export type FightEvent =
  | {
      readonly kind: "damageOverTime";
      readonly actor: number;
      readonly poison: number;
      readonly poisonReduction: number;
      readonly wound: number;
      readonly woundReduction: number;
      readonly injure: number;
      readonly critWound: number;
      readonly lingeringReduction: number;
      readonly anguish: number;
      readonly fire: number;
      readonly fireReduction: number;
      readonly light: number;
      readonly lightReduction: number;
      readonly absolute: number;
      readonly lastHeal: number;
      readonly hp: readonly number[];
    }
  | {
      readonly kind: "energyRegen";
      readonly actor: number;
      readonly amount: number;
      readonly hp: readonly number[];
    }
  | {
      readonly kind: "holyTouchHeal";
      readonly actor: number;
      readonly amount: number;
      readonly hp: readonly number[];
    }
  | { readonly kind: "lostTurn"; readonly actor: number }
  | {
      readonly kind: "step";
      readonly actor: number;
      readonly hp: readonly number[];
    }
  | {
      readonly kind: "heal";
      readonly actor: number;
      readonly amount: number;
      readonly cut: number;
      readonly hp: readonly number[];
    }
  | (CastOutcome & {
      readonly kind: "skill";
      readonly actor: number;
      readonly target: number;
      readonly skill: ActiveSkill;
      readonly comboSpent: number;
      readonly comboDamage: number;
      readonly lastHeal: number;
      readonly hp: readonly number[];
    })
  | (Strike & {
      readonly kind: "strike";
      readonly chances: StrikeChances | null;
      readonly actor: number;
      readonly target: number;
      readonly fastArrow: boolean;
      readonly lastHeal: number;
      readonly hp: readonly number[];
    });

export type FightRecorder = (
  event: FightEvent,
  states: readonly FighterState[],
  turn: number,
) => void;

export type FightResult = {
  readonly winner: number | null;
  readonly moves: number;
  readonly fighters: readonly FighterOutcome[];
};
