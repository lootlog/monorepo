import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { Label } from "@lootlog/ui/components/label";
import { cn } from "cn";
import { useId } from "react";
import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";

export type LootFilterPillOption = {
  value: string;
  label: string;
  /** Recolors one pill, e.g. in its item rarity's frame color. */
  className?: string;
};

type LootFilterPillsProps = {
  label: string;
  options: LootFilterPillOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
};

/** A labelled multi-select row of pills; a pressed pill narrows the list. */
export const LootFilterPills = ({
  label,
  options,
  value,
  onValueChange,
}: LootFilterPillsProps) => {
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
