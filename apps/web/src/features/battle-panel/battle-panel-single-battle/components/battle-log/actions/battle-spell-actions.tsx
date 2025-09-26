import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { cn } from "@lootlog/ui/lib/utils";
import { FC, memo } from "react";
import { Trans } from "react-i18next";
import { generateDynamicValuesAndComponents } from "./dynamic-values-helper";
import { roundHpPercentage, transformAndRoundEnergyMana } from "./value-utils";

export type BattleSpellActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  defender?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattleSpellActions: FC<BattleSpellActionsProps> = memo(({
  actions,
  attacker,
  defender,
  event,
  eventIndex,
}) => {
  if (actions.length === 0) return null;

  const transformValue = (value: string, type: string): string => {
    if (type === "energy" || type === "mana") {
      return transformAndRoundEnergyMana(value);
    }
    return value;
  };

  const teamColors = {
    "bg-red-800/50": attacker?.team === 1,
    "bg-green-800/50": attacker?.team === 2,
  };

  return (
    <div className={cn("px-4 py-1 bg-gray-100/10", teamColors)}>
      {actions.map((action, sIndex) => {
        const processedValue = transformValue(action.value, action.type);
        const dynamicData = generateDynamicValuesAndComponents(action.value);

        return (
          <div key={`spellActions-${eventIndex}-${sIndex}`}>
            <Trans
              i18nKey={`battle.${action.type}`}
              values={{
                name: attacker?.name,
                defenderName: defender?.name,
                value: processedValue,
                hp: roundHpPercentage(event.attackerHpPercentage),
                defenderHp: roundHpPercentage(event.defenderHpPercentage),
                ...dynamicData.values,
              }}
              components={{
                value: <span className="font-semibold" />,
                ...dynamicData.components,
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

BattleSpellActions.displayName = "BattleSpellActions";