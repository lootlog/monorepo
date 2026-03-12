import { useState } from "react";
import { motion } from "framer-motion";
import { GripVertical, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import type { CategoryCustomization } from "@/types/stats-customization.types";
import { CategoryStatsSection } from "./category-stats-section";
import { AvailableStatsSection } from "./available-stats-section";

interface CategoryItemProps {
  category: CategoryCustomization;
  allAvailableStats: Array<{ key: string; label: string }>;
  onToggleVisibility: () => void;
  onUpdateName: (newName: string) => void;
  onUpdateStatOrder: (newOrder: string[]) => void;
  onAddStat: (statKey: string) => void;
  onRemoveStat: (statKey: string) => void;
  onRemoveCategory: () => void;
}

export const CategoryItem = ({
  category,
  allAvailableStats,
  onToggleVisibility,
  onUpdateName,
  onUpdateStatOrder,
  onAddStat,
  onRemoveStat,
  onRemoveCategory,
}: CategoryItemProps) => {
  return (
    <CategoryItemContent
      key={`${category.id}:${category.name}`}
      category={category}
      allAvailableStats={allAvailableStats}
      onToggleVisibility={onToggleVisibility}
      onUpdateName={onUpdateName}
      onUpdateStatOrder={onUpdateStatOrder}
      onAddStat={onAddStat}
      onRemoveStat={onRemoveStat}
      onRemoveCategory={onRemoveCategory}
    />
  );
};

const CategoryItemContent = ({
  category,
  allAvailableStats,
  onToggleVisibility,
  onUpdateName,
  onUpdateStatOrder,
  onAddStat,
  onRemoveStat,
  onRemoveCategory,
}: CategoryItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localName, setLocalName] = useState(category.name);

  const handleNameBlur = () => {
    if (localName.trim() !== category.name) {
      onUpdateName(localName.trim() || category.id);
    }
  };

  const availableStats = allAvailableStats.filter(
    (stat) => !category.statOrder.includes(stat.key),
  );

  return (
    <div className="bg-card border rounded-lg mb-2 overflow-hidden">
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
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t bg-muted/30 space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                W tej kategorii:
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
