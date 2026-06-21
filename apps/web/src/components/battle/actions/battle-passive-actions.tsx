import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { BattleActionItem } from "./battle-action-item";
import { cn } from "@lootlog/ui/lib/utils";
import {
  BATTLE_SURFACE_COLORS,
  BATTLE_TEXT_COLORS,
} from "../utils/battle-color-palette";

export type BattlePassiveActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
  userTeam?: number;
};

export const BattlePassiveActions: FC<BattlePassiveActionsProps> = ({
  actions,
  attacker,
  event,
  eventIndex,
  userTeam,
}) => {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn(BATTLE_SURFACE_COLORS.log.neutral, "py-0.5", {
        [BATTLE_SURFACE_COLORS.log.enemyStrong]: attacker?.team !== userTeam,
        [BATTLE_SURFACE_COLORS.log.friendlyStrong]: attacker?.team === userTeam,
      })}
    >
      {actions.map((action, sIndex) => (
        <BattleActionItem
          key={`passiveActions-${eventIndex}-${sIndex}`}
          action={action}
          attacker={attacker}
          event={event}
          dynamicValuesConfig={{
            prefix: "v",
            component: <span className="font-semibold" />,
          }}
          className={cn("bg-transparent p-0 px-3")}
          customComponents={{
            value: <span className="font-semibold" />,
            heal: (
              <span
                className={cn("font-semibold", BATTLE_TEXT_COLORS.healing.log)}
              />
            ),
            poison: (
              <span
                className={cn(
                  "font-semibold",
                  BATTLE_TEXT_COLORS.damage.poison,
                )}
              />
            ),
            fire: (
              <span
                className={cn("font-semibold", BATTLE_TEXT_COLORS.damage.fire)}
              />
            ),
            light: (
              <span
                className={cn(
                  "font-semibold",
                  BATTLE_TEXT_COLORS.damage.lightning,
                )}
              />
            ),
            anguish: (
              <span
                className={cn(
                  "font-semibold",
                  BATTLE_TEXT_COLORS.legendary.anguish,
                )}
              />
            ),
          }}
        />
      ))}
    </div>
  );
};
