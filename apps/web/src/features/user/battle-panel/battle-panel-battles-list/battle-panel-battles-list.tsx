import { BattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list";
import { FiltersSidebar } from "@/features/user/battle-panel/battle-panel-battles-list/components/filters-sidebar";
import { useQueryStates } from "nuqs";
import type { BattleFilters } from "./components/battles-list-filters";
import { getSelectedWarriorsFromSearch } from "@/features/user/battle-panel/battle-panel-statistics-search";
import {
  useBattlesControllerGetDashboardBattles,
  useBattlesControllerGetUserCharacters,
} from "@/lib/api/generated/battlelog/battles/battles";
import { battleQueryParsers } from "./battle-query-parsers";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Filter } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { WarriorSearchFilter } from "@/components/filters";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

const FILTERS_OPEN_KEY = "battles-filters-open";

export const BattlePanelBattlesList = () => {
  const { t } = useTranslation();
  const [queryState, setQueryState] = useQueryStates(battleQueryParsers);
  const pageSize = 20;
  const isMobile = useIsMobile();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const selectedWarriors = getSelectedWarriorsFromSearch(
    queryState.search ?? undefined,
  );

  const { data: battlesResponse, isLoading: isBattlesLoading } =
    useBattlesControllerGetDashboardBattles({
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
  const { data: charactersResponse } = useBattlesControllerGetUserCharacters();
  const characters = charactersResponse?.characters;

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

  const handleWarriorToggle = (warrior: SearchWarrior) => {
    const isSelected = selectedWarriors.some((w) => w.name === warrior.name);
    const newSelectedWarriors = isSelected
      ? selectedWarriors.filter((w) => w.name !== warrior.name)
      : [...selectedWarriors, warrior];

    const warriorNames = newSelectedWarriors.map((w) => w.name);
    handleFiltersChange({
      ...filters,
      search: warriorNames.length > 0 ? warriorNames.join(",") : undefined,
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
              <DrawerTitle>{t("battlePanel.filters.battlesTitle")}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <FiltersSidebar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                characters={characters}
                className="w-full border-l-0 h-full p-0"
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden bg-background/50">
        <div className="px-3 pt-3 pb-0">
          <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <WarriorSearchFilter
                selectedWarriors={selectedWarriors}
                onWarriorToggle={handleWarriorToggle}
                className="flex-1"
              />
              {!isMobile && (
                <Button
                  onClick={handleToggleFilters}
                  variant={isFiltersOpen ? "default" : "outline"}
                  size="icon"
                  className="relative shrink-0"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-3">
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
                  className="overflow-hidden h-full"
                >
                  <FiltersSidebar
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

      {isMobile && (
        <Button
          onClick={() => setIsMobileFiltersOpen(true)}
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-20"
        >
          <Filter className="h-5 w-5" />
        </Button>
      )}
    </>
  );
};
