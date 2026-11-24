import type { ParsedMove } from "@lootlog/battle-processor/battle-log";
import type { Warrior } from "@lootlog/battle-processor/warrior";

export type BattleWarrior = Warrior;

export type RawBattleParsedEvent = ParsedMove;

export type Battle<TWarrior extends BattleWarrior = BattleWarrior> = {
  readonly characterId: string;
  readonly warriors: TWarrior[];
};

export type RawBattle = {
  readonly characterId: string;
  readonly events: RawBattleParsedEvent[];
};
