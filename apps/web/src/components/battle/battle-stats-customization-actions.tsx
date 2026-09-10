import { Eye, EyeOff } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import type { useStatsCustomization } from "@/hooks/use-stats-customization";
import { StatsCustomizationModal } from "./stats-customization/stats-customization-modal";
import { STAT_CATEGORIES } from "./one-vs-one-stats-definitions";

type Props = {
  customization: ReturnType<typeof useStatsCustomization>;
  compact?: boolean;
  hideZeros: boolean;
  setHideZeros: (value: boolean) => void;
};

export function BattleStatsCustomizationActions({
  customization,
  compact,
  hideZeros,
  setHideZeros,
}: Props) {
  const { t } = useTranslation();
  const {
    config: internalConfig,
    updateCategoryOrder,
    toggleCategoryVisibility,
    updateCategoryName,
    updateStatOrder,
    addStatToCategory,
    removeStatFromCategory,
    addCategory,
    removeCategory,
    resetToDefaults,
  } = customization;
  return (
    <>
      <StatsCustomizationModal
        config={internalConfig}
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
        compactTrigger={compact}
      />
      {compact ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHideZeros(!hideZeros)}
                aria-label={
                  hideZeros
                    ? t("battlePanel.single.statistics.showAll")
                    : t("battlePanel.single.statistics.hideZeros")
                }
                className="size-8"
              >
                {hideZeros ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            }
          />
          <TooltipContent>
            {hideZeros
              ? t("battlePanel.single.statistics.showAll")
              : t("battlePanel.single.statistics.hideZeros")}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHideZeros(!hideZeros)}
          className="gap-2"
        >
          {hideZeros ? (
            <>
              <Eye className="h-4 w-4" />
              {t("battlePanel.single.statistics.showAll")}
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              {t("battlePanel.single.statistics.hideZeros")}
            </>
          )}
        </Button>
      )}
    </>
  );
}
