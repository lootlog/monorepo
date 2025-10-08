import { SharedRawBattleParsedEvent, SharedWarrior } from "./../types/battle";
import { FC, memo } from "react";
import { BattleActionItem } from "./battle-action-item";

export type BattleSystemActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: SharedWarrior;
  event: SharedRawBattleParsedEvent;
  eventIndex: number;
};

export const BattleSystemActions: FC<BattleSystemActionsProps> = memo(
  ({ actions, attacker, event, eventIndex }) => {
    if (actions.length === 0) return null;

    return (
      <>
        {actions.map((action, aIndex) => (
          <BattleActionItem
            key={`systemActions-${eventIndex}-${aIndex}`}
            action={action}
            attacker={attacker}
            event={event}
            customComponents={{
              value: <span className="font-semibold" />,
            }}
          />
        ))}
      </>
    );
  }
);

BattleSystemActions.displayName = "BattleSystemActions";
