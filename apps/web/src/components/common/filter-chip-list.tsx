import { Button } from "@lootlog/ui/components/button";
import { FilterChipButton } from "./filter-chip-button";

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
          <FilterChipButton key={chip.id} onRemove={chip.onRemove}>
            {chip.label}
          </FilterChipButton>
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
