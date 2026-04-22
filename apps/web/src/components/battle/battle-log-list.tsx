import {
  memo,
  useMemo,
  useState,
  startTransition,
  useEffect,
  type FC,
} from "react";
import { BattleEventEntry } from "./battle-event-entry";
import { BattleHeader } from "./battle-header";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

const INITIAL_RENDER_COUNT = 30;

export type BattleLogListProps = {
  events?: RawBattleParsedEvent[];
  characterId?: string;
  warriors: Warrior[];
  userTeam?: number;
};

export const BattleLogList: FC<BattleLogListProps> = memo(
  ({ events, warriors, characterId, userTeam }) => {
    const [showAll, setShowAll] = useState(
      () => !events || events.length <= INITIAL_RENDER_COUNT,
    );

    useEffect(() => {
      if (!showAll) {
        startTransition(() => {
          setShowAll(true);
        });
      }
    }, [showAll]);

    const warriorsMap = useMemo(
      () => new Map(warriors.map((w) => [w.originalId, w])),
      [warriors],
    );

    const visibleEvents = showAll
      ? events
      : events?.slice(0, INITIAL_RENDER_COUNT);

    return (
      <ul className="text-sm">
        <BattleHeader warriors={warriors} characterId={characterId} />
        {visibleEvents?.map((event, eIndex) => {
          const attacker =
            event.attackerId == null
              ? undefined
              : warriorsMap.get(event.attackerId);
          const defender =
            event.defenderId == null
              ? undefined
              : warriorsMap.get(event.defenderId);

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
  },
);

BattleLogList.displayName = "BattleLogList";
