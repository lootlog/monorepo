import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { BattleActionItem } from "./battle-action-item";

export type BattleOutcomeActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export function BattleOutcomeActions({
  actions,
  attacker,
  event,
  eventIndex,
}: BattleOutcomeActionsProps) {
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
}
