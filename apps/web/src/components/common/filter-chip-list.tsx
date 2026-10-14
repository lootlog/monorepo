import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
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
  className?: string;
};

export const FilterChipList = ({
  chips,
  clearLabel,
  onClear,
  className,
}: FilterChipListProps) => {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-background/55 px-3 py-2",
        className,
      )}
    >
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
        size="xs"
        className="shrink-0"
        onClick={onClear}
      >
        {clearLabel}
      </Button>
    </div>
  );
};
