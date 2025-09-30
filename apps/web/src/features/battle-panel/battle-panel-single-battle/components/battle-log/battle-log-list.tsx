import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { FC, memo, useMemo } from "react";
import { BattleEventEntry } from "./actions/battle-event-entry";
import { BattleHeader } from "./actions/battle-header";

export type BattleLogListProps = {
  events?: RawBattleParsedEvent[];
  characterId?: string;
  warriors: Warrior[];
  userTeam?: number;
};

export const BattleLogList: FC<BattleLogListProps> = memo(
  ({ events, warriors, characterId, userTeam }) => {
    const warriorsMap = useMemo(
      () => new Map(warriors.map((w) => [w.originalId, w])),
      [warriors]
    );

    return (
      <ul className="text-sm">
        <BattleHeader warriors={warriors} characterId={characterId} />
        {events?.map((event, eIndex) => {
          const attacker = warriorsMap.get(event.attackerId);
          const defender = warriorsMap.get(event.defenderId);

          return (
            <BattleEventEntry
              key={eIndex}
              event={event}
              attacker={attacker}
              defender={defender}
              eventIndex={eIndex}
              userTeam={userTeam}
            />
          );
        })}
      </ul>
    );
  }
);

BattleLogList.displayName = "BattleLogList";
