import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { BattleActionItem } from "./battle-action-item";
import { cn } from "cn";
import { BATTLE_TEXT_COLORS } from "../utils/battle-color-palette";

export type BattleBuffActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattleBuffActions: FC<BattleBuffActionsProps> = ({
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
          customComponents={{
            value: (
              <span
                className={cn("font-bold", BATTLE_TEXT_COLORS.damage.auxiliary)}
              />
            ),
          }}
        />
      ))}
    </>
  );
};
