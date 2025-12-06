import { Skeleton } from "@lootlog/ui/components/skeleton";
import { groupBy } from "lodash";
import { useState } from "react";
import { SingleTimer } from "@/features/guild/components/timers/single-timer";
import { useTimers } from "@/hooks/api/game-data/use-timers";
import { NPC_TYPE_NAMES, NPC_TYPE_SORT_ORDER } from "@/constants/npc";
import { SearchInput } from "@/components/ui/search-input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";

export const Timers = () => {
  const { data: timers, isPending } = useTimers();
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const filtered = timers?.filter((timer) =>
    timer.npc.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedByTime = filtered?.sort((a, b) => {
    return (
      new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
    );
  });
  const sorted = sortedByTime?.sort((a, b) => {
    return (
      NPC_TYPE_SORT_ORDER.indexOf(a.npc.type) -
      NPC_TYPE_SORT_ORDER.indexOf(b.npc.type)
    );
  });

  const groups = groupBy(sorted, "npc.type");

  return (
    <div>
      <div className="h-14 border-b bg-background flex items-center w-full px-3">
        <SearchInput
          placeholder="Szukaj timerów..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-input/30 h-9 flex-1"
        />
        {!isMobile && (
          <div className="flex items-center gap-2 shrink-0 h-full border-l border-border pl-3 ml-3">
            <WorldSwitcher />
          </div>
        )}
        {isMobile && (
          <div className="pl-3">
            <WorldSwitcher />
          </div>
        )}
      </div>
      {isPending && (
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}
      {!isPending && timers && timers.length === 0 && (
        <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground min-h-[200px]">
          <p>Brak timerów</p>
        </div>
      )}
      {!isPending && timers && timers.length > 0 && (
        <div className="p-3">
          {Object.keys(groups).map((key) => {
            return (
              <div key={key} className="mb-6 last:mb-0">
                <p className="text-sm capitalize font-semibold px-2 py-2 mb-3 text-muted-foreground">
                  {NPC_TYPE_NAMES[key as keyof typeof NPC_TYPE_NAMES] ??
                    "Dodane ręcznie"}{" "}
                  ({groups[key]?.length})
                </p>
                <div className="flex flex-col gap-3">
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
