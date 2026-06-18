import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { BattleActionItem } from "./battle-action-item";
import { cn } from "@lootlog/ui/lib/utils";

export type BattlePassiveActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
  userTeam?: number;
};

export function BattlePassiveActions({
  actions,
  attacker,
  event,
  eventIndex,
  userTeam,
}: BattlePassiveActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn("py-1 bg-gray-100/10", {
        "bg-red-400/[15%]": attacker?.team !== userTeam,
        "bg-green-400/[15%]": attacker?.team === userTeam,
      })}
    >
      {actions.map((action, sIndex) => (
        <BattleActionItem
          key={`passiveActions-${eventIndex}-${sIndex}`}
          action={action}
          attacker={attacker}
          event={event}
          dynamicValuesConfig={{
            prefix: "v",
            component: <span className="font-semibold" />,
          }}
          className={cn("p-0 px-4 bg-transparent")}
          customComponents={{
            value: <span className="font-semibold" />,
            heal: <span className="font-semibold text-blue-300" />,
            poison: <span className="font-semibold text-green-400" />,
            fire: <span className="font-semibold text-red-400" />,
            light: <span className="font-semibold text-yellow-400" />,
            anguish: <span className="font-semibold text-red-600" />,
          }}
        />
      ))}
    </div>
  );
}
