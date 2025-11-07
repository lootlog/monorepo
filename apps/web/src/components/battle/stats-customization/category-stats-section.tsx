import { useState, useEffect, useRef } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";

interface CategoryStatsSectionProps {
  statOrder: string[];
  allAvailableStats: Array<{ key: string; label: string }>;
  onUpdateStatOrder: (newOrder: string[]) => void;
  onRemoveStat: (statKey: string) => void;
}

export const CategoryStatsSection = ({
  statOrder,
  allAvailableStats,
  onUpdateStatOrder,
  onRemoveStat,
}: CategoryStatsSectionProps) => {
  const [localOrder, setLocalOrder] = useState(statOrder);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalOrder(statOrder);
    }
  }, [statOrder]);

  const getStatLabel = (statKey: string) => {
    const stat = allAvailableStats.find((s) => s.key === statKey);
    return stat?.label || statKey;
  };

  const handleReorder = (newOrder: string[]) => {
    setLocalOrder(newOrder);
  };

  if (statOrder.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        Brak statystyk w tej kategorii
      </div>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={localOrder}
      onReorder={handleReorder}
      className="space-y-1"
    >
      {localOrder.map((statKey) => (
        <Reorder.Item
          key={statKey}
          value={statKey}
          className="flex items-center gap-2 bg-background border rounded px-2 py-1.5 text-sm"
          onDragStart={() => {
            isDraggingRef.current = true;
          }}
          onDragEnd={() => {
            isDraggingRef.current = false;
            onUpdateStatOrder(localOrder);
          }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
          <span className="flex-1">{getStatLabel(statKey)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveStat(statKey)}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
};
