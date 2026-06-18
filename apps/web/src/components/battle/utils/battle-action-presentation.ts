import { roundValue } from "./value-utils";

type BattleActionPresentationInput = {
  type: string;
  value: string;
};

type BattleActionPresentation = {
  i18nKey: string;
  values: Record<string, string>;
};

const reducedPassiveActionTypes = new Set([
  "anguish",
  "critwound",
  "injure",
  "wound",
]);

const getRoundedActionValueParts = (value: string): string[] => {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(roundValue);
};

const hasPositiveReduction = (value: string | undefined): value is string => {
  if (!value) {
    return false;
  }

  const numericValue = Number.parseFloat(value);
  return !Number.isNaN(numericValue) && numericValue > 0;
};

export const getBattleActionPresentation = (
  action: BattleActionPresentationInput,
): BattleActionPresentation => {
  if (reducedPassiveActionTypes.has(action.type)) {
    const [damage = action.value, reductionPercent] =
      getRoundedActionValueParts(action.value);

    if (hasPositiveReduction(reductionPercent)) {
      return {
        i18nKey: `battle.${action.type}_reduced`,
        values: {
          value: damage,
          reductionPercent,
        },
      };
    }
  }

  if (action.type !== "-endest") {
    return {
      i18nKey: `battle.${action.type}`,
      values: {
        value: roundValue(action.value),
      },
    };
  }

  const [destroyedEnergy = action.value, reducedBy] =
    getRoundedActionValueParts(action.value);

  if (!hasPositiveReduction(reducedBy)) {
    return {
      i18nKey: "battle.-endest",
      values: {
        value: destroyedEnergy,
      },
    };
  }

  return {
    i18nKey: "battle.-endest_reduced",
    values: {
      value: destroyedEnergy,
      reducedValue: reducedBy,
    },
  };
};
