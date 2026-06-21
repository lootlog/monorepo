import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";
import { Trans } from "react-i18next";
import { generateDynamicValuesAndComponents } from "../utils/dynamic-values-helper";
import { BATTLE_SURFACE_COLORS } from "../utils/battle-color-palette";
import {
  roundHpPercentage,
  transformAndRoundEnergyMana,
} from "../utils/value-utils";

export type BattleSpellActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  defender?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
  userTeam?: number;
};

export const BattleSpellActions: FC<BattleSpellActionsProps> = ({
  actions,
  attacker,
  defender,
  event,
  eventIndex,
  userTeam,
}) => {
  if (actions.length === 0) return null;

  const transformValue = (value: string, type: string): string => {
    if (type === "energy" || type === "mana") {
      return transformAndRoundEnergyMana(value);
    }
    return value;
  };

  const teamColors = {
    [BATTLE_SURFACE_COLORS.log.enemy]: attacker?.team !== userTeam,
    [BATTLE_SURFACE_COLORS.log.friendly]: attacker?.team === userTeam,
  };

  return (
    <div
      className={cn(
        BATTLE_SURFACE_COLORS.log.neutral,
        "px-3 py-0.5",
        teamColors,
      )}
    >
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
};
