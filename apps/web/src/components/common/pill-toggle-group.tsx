import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useInFilterBar } from "@lootlog/ui/components/filter-bar-context";
import { FILTER_PILL_CLASS } from "@lootlog/ui/lib/filter-pill";
import { cn } from "cn";

type PillOption<T extends string> = {
  value: T;
  label: string;
  /** How many entries the pill stands for, after its label. */
  count?: number;
  /** Recolors the count, such as when it needs attention. */
  countClassName?: string;
};

type PillToggleGroupProps<T extends string> = {
  label: string;
  options: readonly PillOption<T>[];
} & (
  | {
      /** Each pressed pill narrows the list; none pressed shows every entry. */
      multiple: true;
      value: T[];
      onValueChange: (value: T[]) => void;
    }
  | {
      /** One pill is always pressed: pressing it again keeps it. */
      multiple?: false;
      value: T;
      onValueChange: (value: T) => void;
    }
);

/**
 * A row of outlined pills. In a list's toolbar the pills move under its
 * filter on phones and scroll sideways in one row, so the pinned toolbar
 * stays short.
 */
export const PillToggleGroup = <T extends string>(
  props: PillToggleGroupProps<T>,
) => {
  const { label, options } = props;
  const inFilterBar = useInFilterBar();

  const toOptionValues = (values: readonly string[]) =>
    options
      .filter((option) => values.includes(option.value))
      .map((option) => option.value);

  const group = (
    <ToggleGroup
      multiple={props.multiple}
      variant="outline"
      size="sm"
      spacing={1.5}
      value={props.multiple ? props.value : [props.value]}
      onValueChange={(values) => {
        if (props.multiple) {
          props.onValueChange(toOptionValues(values));

          return;
        }

        const [pressed] = toOptionValues(values);

        if (pressed !== undefined) props.onValueChange(pressed);
      }}
      aria-label={label}
      className={cn(
        "flex-wrap",
        inFilterBar && "max-sm:w-max max-sm:flex-nowrap",
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={FILTER_PILL_CLASS}
        >
          {option.label}
          {option.count !== undefined && (
            <span
              className={cn(
                "text-muted-foreground tabular-nums",
                option.countClassName,
              )}
            >
              {option.count}
            </span>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  if (!inFilterBar) return group;

  return (
    // Bleeds into the toolbar's phone inset (`LIST_TILE_INSET_CLASS`), so
    // the pills scroll out under its edges.
    <div className="max-sm:order-last max-sm:-mx-3 max-sm:w-[calc(100%+1.5rem)] max-sm:overflow-x-auto max-sm:px-3 max-sm:[scrollbar-width:none]">
      {group}
    </div>
  );
};
