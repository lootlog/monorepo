import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { BattleActionItem } from "./battle-action-item";

export type BattleBuffActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export function BattleBuffActions({
  actions,
  attacker,
  event,
  eventIndex,
}: BattleBuffActionsProps) {
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
            value: <span className="font-bold text-orange-500" />,
          }}
        />
      ))}
    </>
  );
}
