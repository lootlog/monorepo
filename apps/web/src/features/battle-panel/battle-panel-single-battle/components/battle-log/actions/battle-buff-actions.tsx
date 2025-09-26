import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { FC, memo } from "react";
import { BattleActionItem } from "./battle-action-item";

export type BattleBuffActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattleBuffActions: FC<BattleBuffActionsProps> = memo(({
  actions,
  attacker,
  event,
  eventIndex,
}) => {
  if (actions.length === 0) return null;

  return (
    <>
      {actions.map((action, aIndex) => (
        <BattleActionItem
          key={`buffActions-${eventIndex}-${aIndex}`}
          action={action}
          attacker={attacker}
          event={event}
          useTeamColors={false}
          customComponents={{
            value: <span className="font-bold text-orange-500" />,
          }}
        />
      ))}
    </>
  );
});

BattleBuffActions.displayName = "BattleBuffActions";