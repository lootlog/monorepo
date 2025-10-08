import { SharedRawBattleParsedEvent, SharedWarrior } from "../../types/battle";
import { FC, memo, useMemo } from "react";
import { BattleEventEntry } from "./battle-event-entry";
import { BattleHeader } from "./battle-header";

export type BattleLogListProps = {
  events?: SharedRawBattleParsedEvent[];
  characterId?: string;
  warriors: SharedWarrior[];
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
