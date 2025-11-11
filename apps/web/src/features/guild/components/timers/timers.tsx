import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NpcType } from "@/hooks/api/game-data/use-npcs";
import { groupBy } from "lodash";
import { SingleTimer } from "@/features/guild/components/timers/single-timer";
import { useTimers } from "@/hooks/api/game-data/use-timers";

const SORT_ORDER = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.ELITE3,
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

  const sortedByTime = timers?.sort((a, b) => {
    return (
      new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
    );
  });
  const sorted = sortedByTime?.sort((a, b) => {
    return SORT_ORDER.indexOf(a.npc.type) - SORT_ORDER.indexOf(b.npc.type);
  });

  const groups = groupBy(sorted, "npc.type");

  return (
    <div className="h-full">
      {isPending &&
        Array.from({ length: 8 }).map((_, index) => {
          return (
            <div className="flex flex-row justify-between border-b" key={index}>
              <Skeleton className="w-24 h-5 m-2" />{" "}
              <Skeleton className="w-12 h-5 m-2" />
            </div>
          );
        })}
      {!isPending && timers && timers.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
          <p>Brak timerów</p>
        </div>
      )}
      {!isPending && timers && timers.length > 0 && (
        <div>
          {Object.keys(groups).map((key) => {
            return (
              <div key={key} className="border-b">
                <p className="text-sm capitalize font-semibold px-4 py-2 border-b">
                  {NPC_NAMES[key] ?? "Dodane ręcznie"} - {groups[key]?.length}
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
      )}
    </div>
  );
};
