import { useState } from "react";
import * as m from "framer-motion/m";
import { GripVertical, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { useTranslation } from "react-i18next";
import type {
  BattleStatDefinition,
  CategoryCustomization,
} from "@/types/stats-customization.types";
import { CategoryStatsSection } from "./category-stats-section";
import { AvailableStatsSection } from "./available-stats-section";

interface CategoryItemProps {
  category: CategoryCustomization;
  defaultCategoryLabel?: string;
  allAvailableStats: BattleStatDefinition[];
  onToggleVisibility: () => void;
  onUpdateName: (newName: string) => void;
  onUpdateStatOrder: (newOrder: string[]) => void;
  onAddStat: (statKey: string) => void;
  onRemoveStat: (statKey: string) => void;
  onRemoveCategory: () => void;
}

export const CategoryItem = ({
  category,
  defaultCategoryLabel,
  allAvailableStats,
  onToggleVisibility,
  onUpdateName,
  onUpdateStatOrder,
  onAddStat,
  onRemoveStat,
  onRemoveCategory,
}: CategoryItemProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const categoryLabel = category.name ?? defaultCategoryLabel ?? category.id;
  const [localName, setLocalName] = useState(categoryLabel);

  const [previousLabel, setPreviousLabel] = useState(categoryLabel);
  if (previousLabel !== categoryLabel) {
    setPreviousLabel(categoryLabel);
    setLocalName(categoryLabel);
  }

  const handleNameBlur = () => {
    const nextName = localName.trim();

    if (!nextName) {
      setLocalName(categoryLabel);
      return;
    }

    if (nextName !== categoryLabel) {
      onUpdateName(nextName);
    }
  };

  const assignedStatKeys = new Set(category.statOrder);
  const availableStats = allAvailableStats.filter(
    (stat) => !assignedStatKeys.has(String(stat.key)),
  );

  return (
    <div className="border-b border-border/70 overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />

        <Checkbox
          checked={category.visible}
          onCheckedChange={onToggleVisibility}
          className="flex-shrink-0"
        />

        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          className="flex-1 h-8"
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemoveCategory}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0"
        >
          <m.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </m.div>
        </Button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="p-3 border-t border-border/70 bg-muted/20 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                {t("battleUi.customization.inCategory")}
              </div>
              <CategoryStatsSection
                statOrder={category.statOrder}
                allAvailableStats={allAvailableStats}
                onUpdateStatOrder={onUpdateStatOrder}
                onRemoveStat={onRemoveStat}
              />
            </div>

            <AvailableStatsSection
              availableStats={availableStats}
              onAddStat={onAddStat}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
