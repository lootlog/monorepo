import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { BattleActionItem } from "./battle-action-item";

export type BattleSystemActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export function BattleSystemActions({
  actions,
  attacker,
  event,
  eventIndex,
}: BattleSystemActionsProps) {
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
