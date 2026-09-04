import { useState } from "react";
import { Reorder } from "framer-motion";
import { Settings2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import type {
  BattleStatCategoryDefinition,
  BattleStatDefinition,
  StatsCustomizationConfig,
} from "@/types/stats-customization.types";
import { CategoryItem } from "./category-item";
import { AddCategoryForm } from "./add-category-form";
import { cn } from "cn";

interface StatsCustomizationModalProps {
  config: StatsCustomizationConfig;
  defaultCategories: BattleStatCategoryDefinition[];
  onUpdateCategoryOrder: (newOrder: string[]) => void;
  onToggleCategoryVisibility: (categoryId: string) => void;
  onUpdateCategoryName: (categoryId: string, newName: string) => void;
  onUpdateStatOrder: (categoryId: string, newOrder: string[]) => void;
  onAddStatToCategory: (categoryId: string, statKey: string) => void;
  onRemoveStatFromCategory: (categoryId: string, statKey: string) => void;
  onAddCategory: (categoryName: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onResetToDefaults: () => void;
  compactTrigger?: boolean;
}

export const StatsCustomizationModal = ({
  config,
  defaultCategories,
  onUpdateCategoryOrder,
  onToggleCategoryVisibility,
  onUpdateCategoryName,
  onUpdateStatOrder,
  onAddStatToCategory,
  onRemoveStatFromCategory,
  onAddCategory,
  onRemoveCategory,
  onResetToDefaults,
  compactTrigger,
}: StatsCustomizationModalProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [localCategoryOrder, setLocalCategoryOrder] = useState(
    config.categoryOrder,
  );
  const [isDragging, setIsDragging] = useState(false);
  const defaultCategoriesById = new Map<string, BattleStatCategoryDefinition>(
    defaultCategories.map((category) => [category.id, category]),
  );

  const allAvailableStats: BattleStatDefinition[] = Array.from(
    new Map(
      defaultCategories.flatMap((cat) => cat.stats).map((s) => [s.key, s]),
    ).values(),
  );

  const handleCategoryReorder = (newOrder: string[]) => {
    setLocalCategoryOrder(newOrder);
  };

  const configOrderKey = config.categoryOrder.join(":");
  const localOrderKey = localCategoryOrder.join(":");
  const displayedCategoryOrder =
    isDragging || localOrderKey !== configOrderKey
      ? localCategoryOrder
      : config.categoryOrder;
  const triggerLabel = t("battleUi.customization.open");
  const triggerButton = (
    <Button
      variant="outline"
      size={compactTrigger ? "icon" : "sm"}
      aria-label={triggerLabel}
      className={cn(compactTrigger ? "size-8" : "gap-2")}
    >
      <Settings2 className="h-4 w-4" />
      {compactTrigger ? (
        <span className="sr-only">{triggerLabel}</span>
      ) : (
        triggerLabel
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {compactTrigger ? (
        <Tooltip>
          <TooltipTrigger render={<DialogTrigger render={triggerButton} />} />
          <TooltipContent>{triggerLabel}</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={triggerButton} />
      )}
      <DialogContent className="max-sm:w-screen max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-2xl sm:h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 py-4">
          <DialogTitle>{t("battleUi.customization.title")}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-sm:px-2 sm:px-1">
          <div className="space-y-4 p-4">
            <div className="text-sm text-muted-foreground">
              {t("battleUi.customization.description")}
            </div>

            <Reorder.Group
              axis="y"
              values={displayedCategoryOrder}
              onReorder={handleCategoryReorder}
              className="space-y-2"
            >
              {displayedCategoryOrder.map((categoryId) => {
                const customization = config.categories[categoryId];
                const defaultCategory = defaultCategoriesById.get(categoryId);

                if (!customization) {
                  return null;
                }

                return (
                  <Reorder.Item
                    key={categoryId}
                    value={categoryId}
                    onDragStart={() => {
                      setIsDragging(true);
                    }}
                    onDragEnd={() => {
                      setIsDragging(false);
                      onUpdateCategoryOrder(localCategoryOrder);
                    }}
                  >
                    <CategoryItem
                      category={customization}
                      defaultCategoryLabel={
                        defaultCategory
                          ? t(defaultCategory.labelKey)
                          : customization.name
                      }
                      allAvailableStats={allAvailableStats}
                      onToggleVisibility={() =>
                        onToggleCategoryVisibility(categoryId)
                      }
                      onUpdateName={(newName) =>
                        onUpdateCategoryName(categoryId, newName)
                      }
                      onUpdateStatOrder={(newOrder) =>
                        onUpdateStatOrder(categoryId, newOrder)
                      }
                      onAddStat={(statKey) =>
                        onAddStatToCategory(categoryId, statKey)
                      }
                      onRemoveStat={(statKey) =>
                        onRemoveStatFromCategory(categoryId, statKey)
                      }
                      onRemoveCategory={() => onRemoveCategory(categoryId)}
                    />
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>

            <AddCategoryForm onAddCategory={onAddCategory} />
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 p-4">
          <Button
            variant="outline"
            onClick={onResetToDefaults}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t("battleUi.customization.reset")}
          </Button>
          <Button onClick={() => setOpen(false)}>
            {t("battleUi.customization.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
