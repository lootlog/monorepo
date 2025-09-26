import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { FC, memo } from "react";
import { BattleActionItem } from "./battle-action-item";

export type BattlePassiveActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattlePassiveActions: FC<BattlePassiveActionsProps> = memo(({
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
          key={`passiveActions-${eventIndex}-${sIndex}`}
          action={action}
          attacker={attacker}
          event={event}
          teamColorOpacity="40"
          dynamicValuesConfig={{
            prefix: "v",
            component: <span className="font-semibold" />,
          }}
          customComponents={{
            value: <span className="font-semibold" />,
          }}
        />
      ))}
    </>
  );
});

BattlePassiveActions.displayName = "BattlePassiveActions";