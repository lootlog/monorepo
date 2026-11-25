import type { TFunction } from "i18next";
import type { BattleWarrior, RawBattleParsedEvent } from "./battle-types";
import { battleMessageText, buildBattleEventMessage } from "./battle-message";

export function buildBattleLogVisibleText({
  event,
  attacker,
  defender,
  turn,
  t,
}: {
  event: RawBattleParsedEvent;
  attacker?: BattleWarrior;
  defender?: BattleWarrior;
  turn: number;
  t: TFunction;
}): string {
  return `#${turn}\n${battleMessageText(
    buildBattleEventMessage({ event, attacker, defender, translate: t }),
  )}`;
}
