import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { Label } from "@lootlog/ui/components/label";
import { cn } from "cn";
import { useId } from "react";
import { FILTER_PILL_CLASS } from "@lootlog/ui/lib/filter-pill";

export type FilterPillOption = {
  value: string;
  label: string;
  /** Recolors one pill, e.g. in its item rarity's frame color. */
  className?: string;
};

type FilterPillsProps = {
  label: string;
  options: FilterPillOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
};

/** A labelled multi-select row of pills; a pressed pill narrows the list. */
export const FilterPills = ({
  label,
  options,
  value,
  onValueChange,
}: FilterPillsProps) => {
  const labelId = useId();

  return (
    <div className="space-y-2">
      <Label id={labelId} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <ToggleGroup
        multiple
        variant="outline"
        size="sm"
        spacing={1.5}
        value={value}
        onValueChange={onValueChange}
        aria-labelledby={labelId}
        className="w-full flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(FILTER_PILL_CLASS, option.className)}
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
