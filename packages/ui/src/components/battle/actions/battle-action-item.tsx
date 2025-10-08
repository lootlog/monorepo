import { SharedRawBattleParsedEvent, SharedWarrior } from "../../../types/battle";
import { cn } from "../../../lib/utils";
import { FC, memo, ReactNode } from "react";
import { Trans } from "react-i18next";
import {
  DynamicValuesConfig,
  generateDynamicValuesAndComponents,
} from "../utils/dynamic-values-helper";
import { roundHpPercentage, roundValue } from "../utils/value-utils";

export type BattleActionItemProps = {
  action: { type: string; value: string };
  attacker?: SharedWarrior;
  defender?: SharedWarrior;
  event: SharedRawBattleParsedEvent;
  className?: string;
  customComponents?: Record<string, ReactNode>;
  transformValue?: (value: string, type: string) => string;
  dynamicValuesConfig?: DynamicValuesConfig;
};

export const BattleActionItem: FC<BattleActionItemProps> = memo(
  ({
    action,
    attacker,
    defender,
    event,
    className,
    customComponents = {},
    transformValue,
    dynamicValuesConfig,
  }) => {
    const roundedValue = roundValue(action.value);

    const processedValue = transformValue
      ? transformValue(roundedValue, action.type)
      : roundedValue;

    const dynamicData = generateDynamicValuesAndComponents(
      action.value,
      dynamicValuesConfig?.prefix || "v",
      dynamicValuesConfig?.component || <span className="font-semibold" />
    );

    return (
      <div className={cn("px-4 py-1 bg-gray-100/10", className)}>
        <Trans
          i18nKey={`battle.${action.type}`}
          values={{
            name: attacker?.name,
            defenderName: defender?.name,
            value: processedValue,
            hp: roundHpPercentage(event.attackerHpPercentage),
            defenderHp: roundHpPercentage(event.defenderHpPercentage),
            v1: 0,
            ...dynamicData.values,
          }}
          components={{
            value: <span className="font-semibold" />,
            ...dynamicData.components,
            ...dynamicValuesConfig?.customComponents,
            ...customComponents,
          }}
        />
      </div>
    );
  }
);

BattleActionItem.displayName = "BattleActionItem";
