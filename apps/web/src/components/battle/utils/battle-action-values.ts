import type {
  BattleWarrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import {
  processDamageValue,
  roundHpPercentage,
  roundValue,
  transformAndRoundEnergyMana,
} from "./value-utils";
import { getBattleActionPresentation } from "./battle-action-presentation";

export const getDynamicBattleValues = (
  value: string,
  prefix = "v",
): Record<string, string> =>
  Object.fromEntries(
    value
      .split(",")
      .map((part, index) => [`${prefix}${index}`, roundValue(part.trim())]),
  );

export function getBattleActionValues(
  action: { type: string; value: string },
  event: RawBattleParsedEvent,
  attacker?: BattleWarrior,
  defender?: BattleWarrior,
  mode: "generic" | "spell" | "attack" = "generic",
) {
  const presentation = getBattleActionPresentation(action);
  return {
    name: attacker?.name,
    defenderName: defender?.name,
    value:
      mode === "spell" && (action.type === "energy" || action.type === "mana")
        ? transformAndRoundEnergyMana(action.value)
        : roundValue(action.value),
    hp: roundHpPercentage(event.attackerHpPercentage),
    defenderHp: roundHpPercentage(event.defenderHpPercentage),
    ...(mode === "generic" ? { v1: 0 } : {}),
    ...(mode === "spell" ? {} : presentation.values),
    ...getDynamicBattleValues(action.value),
  };
}

export function groupBattleAttackDamage(
  actions: { type: string; value: string }[],
) {
  const positiveDamage = {
    dmgd: "",
    dmgf: "",
    dmgl: "",
    dmg: "",
    dmgo: "",
    dmga: "",
    dmgc: "",
    thirdatt: "",
  };
  const negativeDamage = {
    dmgd: "",
    dmgf: "",
    dmgl: "",
    dmg: "",
    dmgo: "",
    dmga: "",
    dmgc: "",
    thirdatt: "",
  };
  const otherActions: { type: string; value: string }[] = [];

  actions.forEach((action) => {
    if (action.type === "+dmgd")
      positiveDamage.dmgd = processDamageValue(action.value, "+");
    else if (action.type === "+dmgf")
      positiveDamage.dmgf = processDamageValue(action.value, "+");
    else if (action.type === "+dmgl")
      positiveDamage.dmgl = processDamageValue(action.value, "+");
    else if (action.type === "-dmgd")
      negativeDamage.dmgd = processDamageValue(action.value, "-");
    else if (action.type === "-dmgf")
      negativeDamage.dmgf = processDamageValue(action.value, "-");
    else if (action.type === "-dmgl")
      negativeDamage.dmgl = processDamageValue(action.value, "-");
    else if (action.type === "-dmg")
      negativeDamage.dmg = processDamageValue(action.value, "-");
    else if (action.type === "+dmg")
      positiveDamage.dmg = processDamageValue(action.value, "+");
    else if (action.type === "-dmgo")
      negativeDamage.dmgo = processDamageValue(action.value, "-");
    else if (action.type === "-dmga")
      negativeDamage.dmga = processDamageValue(action.value, "-");
    else if (action.type === "+dmgo")
      positiveDamage.dmgo = processDamageValue(action.value, "+");
    else if (action.type === "+dmgc")
      positiveDamage.dmgc = processDamageValue(action.value, "+");
    else if (action.type === "-dmgc")
      negativeDamage.dmgc = processDamageValue(action.value, "-");
    else if (action.type === "+thirdatt") {
      positiveDamage.thirdatt = processDamageValue(action.value, "+");
      otherActions.push(action);
    } else if (action.type === "-thirdatt") {
      negativeDamage.thirdatt = processDamageValue(action.value, "-");
    } else otherActions.push(action);
  });

  const hasPositiveDamage =
    positiveDamage.dmgd ||
    positiveDamage.dmgf ||
    positiveDamage.dmgl ||
    positiveDamage.dmg ||
    positiveDamage.dmgo ||
    positiveDamage.thirdatt ||
    positiveDamage.dmgc;
  const hasNegativeDamage =
    negativeDamage.dmgd ||
    negativeDamage.dmgf ||
    negativeDamage.dmgl ||
    negativeDamage.dmg ||
    negativeDamage.dmgo ||
    negativeDamage.dmga ||
    negativeDamage.thirdatt ||
    negativeDamage.dmgc;

  return {
    positiveDamage,
    negativeDamage,
    otherActions,
    hasPositiveDamage,
    hasNegativeDamage,
  };
}
