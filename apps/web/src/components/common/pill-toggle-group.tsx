import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { FILTER_PILL_CLASS } from "@lootlog/ui/lib/filter-pill";

type PillOption<T extends string> = {
  value: T;
  label: string;
};

type PillToggleGroupProps<T extends string> = {
  label: string;
  options: readonly PillOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
};

export const PillToggleGroup = <T extends string>({
  label,
  options,
  value,
  onValueChange,
}: PillToggleGroupProps<T>) => (
  <ToggleGroup
    variant="outline"
    size="sm"
    spacing={1.5}
    value={[value]}
    onValueChange={(values) => {
      const pressed = options.find((option) => values.includes(option.value));

      if (pressed) onValueChange(pressed.value);
    }}
    aria-label={label}
    className="flex-wrap"
  >
    {options.map((option) => (
      <ToggleGroupItem
        key={option.value}
        value={option.value}
        className={FILTER_PILL_CLASS}
      >
        {option.label}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);
