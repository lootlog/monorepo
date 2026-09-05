import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import type { FC } from "react";
import { BattleActionItem } from "./battle-action-item";

export type BattleActionListProps = {
  valueClassName?: string;
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattleActionList: FC<BattleActionListProps> = ({
  actions,
  valueClassName = "font-semibold",
  attacker,
  event,
  eventIndex,
}) => {
  if (actions.length === 0) return null;

  return (
    <>
      {actions.map((action, aIndex) => (
        <BattleActionItem
          key={`${eventIndex}-${aIndex}`}
          action={action}
          attacker={attacker}
          event={event}
          customComponents={{
            value: <span className={valueClassName} />,
          }}
        />
      ))}
    </>
  );
};
