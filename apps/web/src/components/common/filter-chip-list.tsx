import { Button } from "@lootlog/ui/components/button";
import { X } from "lucide-react";

export type FilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type FilterChipListProps = {
  chips: FilterChip[];
  clearLabel: string;
  onClear: () => void;
};

export const FilterChipList = ({
  chips,
  clearLabel,
  onClear,
}: FilterChipListProps) => {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/55 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <Button
            key={chip.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 max-w-full gap-1.5 border-primary/25 bg-primary/5 px-2 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
            onClick={chip.onRemove}
          >
            <span className="truncate">{chip.label}</span>
            <X className="size-3" aria-hidden="true" />
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-xs"
        onClick={onClear}
      >
        {clearLabel}
      </Button>
    </div>
  );
};
