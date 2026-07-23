import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import groupBy from "lodash/groupBy";
import { Grid2X2, List } from "lucide-react";
import { useState } from "react";
import { SingleTimer } from "./single-timer";
import { NPC_TYPE_NAMES, NPC_TYPE_SORT_ORDER } from "@/constants/npc";
import { SearchInput } from "@/components/ui/search-input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useViewMode } from "@/hooks/use-view-mode";
import { useTranslation } from "react-i18next";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getTimersControllerGetTimersQueryKey,
  useTimersControllerGetTimers,
} from "@lootlog/api-client/react-query/main/timers";

export const Timers = () => {
  const guildId = useGuildId();
  const { world } = useGuildContext();
  const { data: timers, isPending } = useTimersControllerGetTimers(
    { guildId: guildId ?? "" },
    { world },
    {
      query: {
        enabled: !!guildId && !!world,
        queryKey: getTimersControllerGetTimersQueryKey(
          { guildId: guildId ?? "" },
          { world },
        ),
        staleTime: 15_000,
      },
    },
  );
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const { viewMode, setViewMode } = useViewMode("timers-view-mode", "list");
  const { t } = useTranslation();

  const filtered = timers?.filter((timer) =>
    timer.npc?.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedByTime = filtered?.sort((a, b) => {
    return (
      new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
    );
  });
  const sorted = sortedByTime?.sort((a, b) => {
    return (
      NPC_TYPE_SORT_ORDER.indexOf(
        a.npc?.type as (typeof NPC_TYPE_SORT_ORDER)[number],
      ) -
      NPC_TYPE_SORT_ORDER.indexOf(
        b.npc?.type as (typeof NPC_TYPE_SORT_ORDER)[number],
      )
    );
  });

  const groups = groupBy(sorted, (timer) => timer.npc?.type ?? "");

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SearchInput
                placeholder={t("timers.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
                wrapperClassName="flex-1"
              />
              {!isMobile && (
                <div className="flex items-center gap-2 shrink-0 border-l border-border pl-3">
                  <WorldSwitcher />
                </div>
              )}
              {isMobile && <WorldSwitcher />}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setViewMode("list")}
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{t("timers.view.list")}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setViewMode("grid")}
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Grid2X2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{t("timers.view.grid")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </Card>

          {isPending && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}
          {!isPending && timers && timers.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 bg-card/40 py-12 backdrop-blur-sm">
              <p className="text-muted-foreground">{t("timers.empty")}</p>
            </Card>
          )}
          {!isPending && timers && timers.length > 0 && (
            <div className="flex flex-col gap-4">
              {Object.keys(groups).map((key) => {
                return (
                  <div key={key}>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">
                      {NPC_TYPE_NAMES[key as keyof typeof NPC_TYPE_NAMES] ??
                        t("timers.npcType.manual")}{" "}
                      ({groups[key]?.length})
                    </p>
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 gap-1.5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                          : "flex flex-col gap-1.5"
                      }
                    >
                      {groups[key]?.map((timer) => {
                        return (
                          <SingleTimer
                            key={timer.npc?.id ?? timer.timerKey}
                            timer={timer}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
