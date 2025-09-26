import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { cn } from "@lootlog/ui/lib/utils";
import { FC, memo, ReactNode } from "react";
import { Trans } from "react-i18next";
import { DynamicValuesConfig, generateDynamicValuesAndComponents } from "./dynamic-values-helper";

export type BattleActionItemProps = {
  action: { type: string; value: string };
  attacker?: Warrior;
  defender?: Warrior;
  event: RawBattleParsedEvent;
  className?: string;
  customComponents?: Record<string, ReactNode>;
  transformValue?: (value: string, type: string) => string;
  useTeamColors?: boolean;
  teamColorOpacity?: "40" | "50";
  dynamicValuesConfig?: DynamicValuesConfig;
};

export const BattleActionItem: FC<BattleActionItemProps> = memo(({
  action,
  attacker,
  defender,
  event,
  className,
  customComponents = {},
  transformValue,
  useTeamColors = true,
  teamColorOpacity = "50",
  dynamicValuesConfig,
}) => {
  const processedValue = transformValue ? transformValue(action.value, action.type) : action.value;

  // Generate dynamic values and components
  const dynamicData = generateDynamicValuesAndComponents(
    action.value,
    dynamicValuesConfig?.prefix || "v",
    dynamicValuesConfig?.component || <span className="font-semibold" />
  );

  const teamColors = useTeamColors ? {
    [`bg-red-800/${teamColorOpacity}`]: attacker?.team === 1,
    [`bg-green-800/${teamColorOpacity}`]: attacker?.team === 2,
  } : {};

  return (
    <div
      className={cn("px-4 py-1 bg-gray-100/10", className, teamColors)}
    >
      <Trans
        i18nKey={`battle.${action.type}`}
        values={{
          name: attacker?.name,
          defenderName: defender?.name,
          value: processedValue,
          hp: event.attackerHpPercentage,
          defenderHp: event.defenderHpPercentage,
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
});

BattleActionItem.displayName = "BattleActionItem";