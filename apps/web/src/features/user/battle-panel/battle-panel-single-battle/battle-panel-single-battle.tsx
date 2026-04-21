import {
  BattleLog,
  BattleStatsTable,
  StatsCustomizationModal,
} from "@/components/battle";
import { STAT_CATEGORIES } from "@/components/battle/one-vs-one-stats-table";
import { BattleOverview } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-overview";
import {
  useBattlesControllerGetBattle,
  useBattlesControllerGetBattleRawData,
} from "@/lib/api/generated/battlelog/battles/battles";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@lootlog/ui/components/button";
import { ChartArea, Eye, EyeOff, Sword } from "lucide-react";
import { useState } from "react";

export const BattlePanelSingleBattle = () => {
  const { battleId } = useParams({
    from: "/_authenticated/@me/battle-panel/battles_/$battleId",
  });
  const { data: battle } = useBattlesControllerGetBattle({ battleId });
  const { data: rawBattle } = useBattlesControllerGetBattleRawData({
    battleId,
  });
  const [hideZeros, setHideZeros] = useState(true);

  const {
    config,
    updateCategoryOrder,
    toggleCategoryVisibility,
    updateCategoryName,
    updateStatOrder,
    addStatToCategory,
    removeStatFromCategory,
    addCategory,
    removeCategory,
    resetToDefaults,
  } = useStatsCustomization(STAT_CATEGORIES);

  const is1v1 = battle?.type === "1v1";

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="px-3 py-3 flex flex-col gap-4">
        {battle && <BattleOverview battle={battle} showHeader={false} />}

        {is1v1 ? (
          <>
            <SectionHeader
              icon={ChartArea}
              title="Statystyki walki"
              actions={
                <div className="flex items-center gap-2">
                  <StatsCustomizationModal
                    config={config}
                    defaultCategories={STAT_CATEGORIES}
                    onUpdateCategoryOrder={updateCategoryOrder}
                    onToggleCategoryVisibility={toggleCategoryVisibility}
                    onUpdateCategoryName={updateCategoryName}
                    onUpdateStatOrder={updateStatOrder}
                    onAddStatToCategory={addStatToCategory}
                    onRemoveStatFromCategory={removeStatFromCategory}
                    onAddCategory={addCategory}
                    onRemoveCategory={removeCategory}
                    onResetToDefaults={resetToDefaults}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHideZeros(!hideZeros)}
                    className="gap-2"
                  >
                    {hideZeros ? (
                      <>
                        <Eye className="h-4 w-4" />
                        Pokaż wszystkie
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Ukryj zerowe wartości
                      </>
                    )}
                  </Button>
                </div>
              }
            />
            {battle && (
              <BattleStatsTable
                battle={battle}
                showHeader={false}
                hideZeros={hideZeros}
                onHideZerosChange={setHideZeros}
              />
            )}
            <SectionHeader icon={Sword} title="Przebieg walki" />
            {rawBattle && battle && (
              <BattleLog
                rawBattle={rawBattle?.rawData}
                warriors={battle.warriors}
                showHeader={false}
              />
            )}
          </>
        ) : (
          <>
            <SectionHeader icon={ChartArea} title="Statystyki walki" />
            {battle && <BattleStatsTable battle={battle} showHeader={false} />}
            <SectionHeader icon={Sword} title="Przebieg walki" />
            {rawBattle && battle && (
              <BattleLog
                rawBattle={rawBattle?.rawData}
                warriors={battle.warriors}
                showHeader={false}
              />
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
};
