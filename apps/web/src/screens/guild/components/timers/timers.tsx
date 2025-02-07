import { ScrollArea } from "components/ui/scroll-area";
import { Skeleton } from "components/ui/skeleton";
import { NpcType } from "hooks/api/use-npcs";
import { useTimers } from "hooks/api/use-timers";
import { groupBy } from "lodash";
import { SingleTimer } from "screens/guild/components/timers/single-timer";

const SORT_ORDER = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.ELITE2,
  NpcType.ELITE,
];
const NPC_NAMES: { [key: string]: string } = {
  TITAN: "Tytan",
  COLOSSUS: "Kolos",
  HERO: "Heros",
  ELITE3: "Elita III",
  ELITE2: "Elita II",
  ELITE: "Elita",
};

export const Timers = () => {
  const { data: timers, isPending } = useTimers();

  const sorted = timers?.sort((a, b) => {
    return SORT_ORDER.indexOf(a.npc.type) - SORT_ORDER.indexOf(b.npc.type);
  });

  const groups = groupBy(sorted, "npc.type");

  return (
    <ScrollArea className="h-[calc(100dvh_-_64px)]">
      <div>
        {Object.keys(groups).map((key) => {
          return (
            <div key={key} className="border-b">
              <p className="text-sm capitalize font-semibold px-4 py-2 border-b">
                {NPC_NAMES[key]} - {groups[key].length}
              </p>
              <div>
                {groups[key]?.map((timer) => {
                  return <SingleTimer key={timer.npc.id} timer={timer} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      {isPending &&
        Array.from({ length: 8 }).map((_, index) => {
          return (
            <div className="flex flex-row justify-between border-b" key={index}>
              <Skeleton className={`w-24 h-5 m-2`} />{" "}
              <Skeleton className="w-12 h-5 m-2" />
            </div>
          );
        })}
    </ScrollArea>
  );
};
