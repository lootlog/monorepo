import type { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import type { FC } from "react";
import { BattleActionItem } from "./battle-action-item";
import type { Warrior } from "@/hooks/api/battle-log/use-battles";

export type BattleOutcomeActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattleOutcomeActions: FC<BattleOutcomeActionsProps> = ({
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
};
