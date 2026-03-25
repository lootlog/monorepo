import { BattlesList } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list";
import { BattlesFiltersSidebar } from "@/features/battle-panel/battle-panel-battles-list/components/battles-filters-sidebar";
import { useQueryStates } from "nuqs";
import type { BattleFilters } from "./components/battles-list-filters";
import { useBattles } from "@/hooks/api/battle-log/use-battles";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { battleQueryParsers } from "./battle-query-parsers";
import { useBattleFiltersStore } from "@/store/battle-filters.store";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";
import { Button } from "@lootlog/ui/components/button";
import { Filter, Swords } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";

const FILTERS_OPEN_KEY = "battles-filters-open";

export const BattlePanelBattlesList = () => {
  const [queryState, setQueryState] = useQueryStates(battleQueryParsers);
  const pageSize = 20;
  const isMobile = useIsMobile();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );
  const setCurrentCharacterId = useBattleFiltersStore(
    (state) => state.setCurrentCharacterId,
  );

  useEffect(() => {
    if (queryState.characterId && queryState.characterId.length > 0) {
      const firstCharId = queryState.characterId[0];
      if (firstCharId !== currentCharacterId) {
        setCurrentCharacterId(firstCharId);
      }
    }
  }, [queryState.characterId, currentCharacterId, setCurrentCharacterId]);

  const { data: battlesResponse, isLoading: isBattlesLoading } = useBattles({
    cursor: queryState.cursor ?? undefined,
    size: pageSize,
    includeTotal: true,
    world: queryState.world ?? undefined,
    type: queryState.type ?? undefined,
    search: queryState.search ?? undefined,
    result: queryState.result ?? undefined,
    ph: queryState.ph ?? undefined,
    matchmaking: queryState.matchmaking ?? undefined,
    characterId: queryState.characterId ?? undefined,
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
  });
  const { data: characters } = useBattleCharacters();

  const filters: BattleFilters = {
    world: queryState.world ?? undefined,
    type: queryState.type ?? undefined,
    search: queryState.search ?? undefined,
    result: queryState.result ?? undefined,
    ph: queryState.ph ?? undefined,
    matchmaking: queryState.matchmaking ?? undefined,
    characterId: queryState.characterId ?? undefined,
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
  };

  const handleCursorChange = (cursor: string | undefined) => {
    setQueryState({ cursor: cursor ?? null });
  };

  const handleFiltersChange = (newFilters: BattleFilters) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore.getState().updateFilters(currentId, {
      world: newFilters.world,
      type: newFilters.type,
      result: newFilters.result,
      ph: newFilters.ph,
      matchmaking: newFilters.matchmaking,
      minLevel: newFilters.minLevel,
      maxLevel: newFilters.maxLevel,
    });

    setQueryState({
      cursor: null,
      world: newFilters.world ?? null,
      type: newFilters.type ?? null,
      search: newFilters.search ?? null,
      result: newFilters.result ?? null,
      ph: newFilters.ph ?? null,
      matchmaking: newFilters.matchmaking ?? null,
      characterId: newFilters.characterId ?? null,
      minLevel: newFilters.minLevel ?? 1,
      maxLevel: newFilters.maxLevel ?? 500,
    });
  };

  const handleToggleFilters = () => {
    if (isMobile) {
      setIsMobileFiltersOpen((prev) => !prev);
      return;
    }
    setIsFiltersOpen((prev) => !prev);
  };

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          shouldScaleBackground={false}
        >
          <DrawerContent className="p-0 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <DrawerTitle>Filtry walk</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <BattlesFiltersSidebar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                characters={characters}
                className="w-full border-l-0 h-full"
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden">
        <div className="bg-card/60 backdrop-blur-sm w-full flex items-center border-b h-14">
          <div className="flex-1 min-w-0 px-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 shadow-inner shadow-primary/10">
                <Swords className="size-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Historia walk</h2>
            </div>
          </div>

          {!isMobile && (
            <div className="flex items-center gap-2 pr-3">
              <Button
                onClick={handleToggleFilters}
                variant={isFiltersOpen ? "default" : "outline"}
                size="icon"
                className="relative shrink-0"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isMobile && (
            <div className="pr-3">
              <Button
                onClick={handleToggleFilters}
                variant="outline"
                size="icon"
                className="relative shrink-0"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/20">
            <BattlesList
              battlesResponse={battlesResponse}
              characters={characters}
              params={{
                cursor: queryState.cursor ?? undefined,
                size: pageSize,
                world: filters.world,
                type: filters.type,
                search: filters.search,
                result: filters.result,
                ph: filters.ph,
                matchmaking: filters.matchmaking,
                characterId: filters.characterId,
                minLevel: filters.minLevel,
                maxLevel: filters.maxLevel,
              }}
              onCursorChange={handleCursorChange}
              onFiltersChange={handleFiltersChange}
              showPagination
              isLoading={isBattlesLoading}
              enableScrollToTop
            />
          </div>

          {!isMobile && (
            <AnimatePresence initial={false}>
              {isFiltersOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden h-full border-l border-border"
                >
                  <BattlesFiltersSidebar
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    characters={characters}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
};
