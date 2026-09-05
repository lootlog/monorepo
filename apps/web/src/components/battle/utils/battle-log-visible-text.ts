import type { TFunction } from "i18next";
import type {
  BattleWarrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { parseActions } from "./battle-actions-parser";
import { getBattleActionPresentation } from "./battle-action-presentation";
import {
  getBattleActionValues,
  groupBattleAttackDamage,
} from "./battle-action-values";
import { roundHpPercentage } from "./value-utils";

const interpolationEntities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x2F;": "/",
  "&#x60;": "`",
  "&#x3D;": "=",
};

// Strip only translation markup before decoding interpolated character names.
const translateText = (
  t: TFunction,
  key: string,
  values: Record<string, unknown>,
) =>
  t(key, { ...values, interpolation: { escapeValue: true } })
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(?:amp|lt|gt|quot|#39|#x2F|#x60|#x3D);/g,
      (entity) => interpolationEntities[entity] ?? entity,
    );

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
  const parsed = parseActions(event.actions);
  const actionText = (
    action: { type: string; value: string },
    mode: "generic" | "spell" | "attack" = "generic",
    target?: BattleWarrior,
  ) =>
    translateText(
      t,
      mode === "spell"
        ? `battle.${action.type}`
        : getBattleActionPresentation(action).i18nKey,
      getBattleActionValues(action, event, attacker, target, mode),
    );
  const damage = groupBattleAttackDamage(parsed.attackActions);
  const attackText = [
    damage.hasPositiveDamage
      ? translateText(t, "battle.+combined_dmg", {
          name: attacker?.name,
          hp: roundHpPercentage(event.attackerHpPercentage),
          ...damage.positiveDamage,
        })
      : "",
    ...damage.otherActions.map((action) =>
      actionText(action, "attack", defender),
    ),
    damage.hasNegativeDamage
      ? translateText(t, "battle.-combined_dmg", {
          name: defender?.name,
          hp: roundHpPercentage(event.defenderHpPercentage),
          ...damage.negativeDamage,
        })
      : "",
  ];
  return [
    `#${turn}`,
    ...parsed.buffActions.map((action) => actionText(action)),
    ...parsed.systemActions.map((action) => actionText(action)),
    ...parsed.spellActions.map((action) =>
      actionText(action, "spell", defender),
    ),
    ...attackText,
    ...parsed.passiveActions.map((action) => actionText(action)),
    ...parsed.outcomeActions.map((action) => actionText(action)),
  ].join("");
}
