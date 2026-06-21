import { cn } from "@lootlog/ui/lib/utils";
import type { FC, ReactNode } from "react";
import { Trans } from "react-i18next";
import {
  generateDynamicValuesAndComponents,
  type DynamicValuesConfig,
} from "../utils/dynamic-values-helper";
import { getBattleActionPresentation } from "../utils/battle-action-presentation";
import { BATTLE_SURFACE_COLORS } from "../utils/battle-color-palette";
import { roundHpPercentage, roundValue } from "../utils/value-utils";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

export type BattleActionItemProps = {
  action: { type: string; value: string };
  attacker?: Warrior;
  defender?: Warrior;
  event: RawBattleParsedEvent;
  className?: string;
  customComponents?: Record<string, ReactNode>;
  transformValue?: (value: string, type: string) => string;
  dynamicValuesConfig?: DynamicValuesConfig;
};

export const BattleActionItem: FC<BattleActionItemProps> = ({
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
  const actionPresentation = getBattleActionPresentation(action);

  const dynamicData = generateDynamicValuesAndComponents(
    action.value,
    dynamicValuesConfig?.prefix ?? "v",
    dynamicValuesConfig?.component ?? <span className="font-semibold" />,
  );

  return (
    <div
      className={cn(
        BATTLE_SURFACE_COLORS.log.neutral,
        "px-3 py-0.5",
        className,
      )}
    >
      <Trans
        i18nKey={actionPresentation.i18nKey}
        values={{
          name: attacker?.name,
          defenderName: defender?.name,
          value: processedValue,
          hp: roundHpPercentage(event.attackerHpPercentage),
          defenderHp: roundHpPercentage(event.defenderHpPercentage),
          v1: 0,
          ...actionPresentation.values,
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
};
