import { getBattleActionValues } from "../utils/battle-action-values";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { cn } from "cn";
import type { FC } from "react";
import { Trans } from "react-i18next";
import { generateDynamicValuesAndComponents } from "../utils/dynamic-values-helper";
import { BATTLE_SURFACE_COLORS } from "../utils/battle-color-palette";

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
        const dynamicData = generateDynamicValuesAndComponents(action.value);

        return (
          <div key={`spellActions-${eventIndex}-${sIndex}`}>
            <Trans
              i18nKey={`battle.${action.type}`}
              values={getBattleActionValues(
                action,
                event,
                attacker,
                defender,
                "spell",
              )}
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
