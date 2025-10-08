import { SharedRawBattleParsedEvent, SharedWarrior } from "../../../types/battle";
import { FC, memo } from "react";
import { BattleActionItem } from "./battle-action-item";
import { cn } from "../../../lib/utils";

export type BattlePassiveActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: SharedWarrior;
  event: SharedRawBattleParsedEvent;
  eventIndex: number;
  userTeam?: number;
};

export const BattlePassiveActions: FC<BattlePassiveActionsProps> = memo(
  ({ actions, attacker, event, eventIndex, userTeam }) => {
    if (actions.length === 0) return null;

    return (
      <div
        className={cn("py-1 bg-gray-100/10", {
          "bg-red-400/[15%]": attacker?.team !== userTeam,
          "bg-green-400/[15%]": attacker?.team === userTeam,
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
            className={cn("p-0 px-4 bg-transparent")}
            customComponents={{
              value: <span className="font-semibold" />,
              heal: <span className="font-semibold text-blue-300" />,
              poison: <span className="font-semibold text-green-400" />,
              fire: <span className="font-semibold text-red-400" />,
              light: <span className="font-semibold text-yellow-400" />,
            }}
          />
        ))}
      </div>
    );
  }
);

BattlePassiveActions.displayName = "BattlePassiveActions";
