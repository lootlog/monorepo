import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { FC, memo } from "react";
import { BattleActionItem } from "./battle-action-item";

export type BattleOutcomeActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattleOutcomeActions: FC<BattleOutcomeActionsProps> = memo(({
  actions,
  attacker,
  event,
  eventIndex,
}) => {
  if (actions.length === 0) return null;

  return (
    <>
      {actions.map((action, sIndex) => (
        <BattleActionItem
          key={`outcomeActions-${eventIndex}-${sIndex}`}
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
});

BattleOutcomeActions.displayName = "BattleOutcomeActions";