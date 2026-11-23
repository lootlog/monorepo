import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { cn } from "cn";
import type { ComponentProps } from "react";

type SegmentedControlProps<Value extends string> = Omit<
  ToggleGroup.Props<Value>,
  "value" | "defaultValue" | "onValueChange" | "multiple"
> & {
  value: Value;
  onValueChange: (value: Value) => void;
};

export function SegmentedControl<Value extends string>({
  value,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps<Value>) {
  return (
    <ToggleGroup<Value>
      value={[value]}
      onValueChange={(values) => {
        const [next] = values;

        if (next !== undefined) onValueChange(next);
      }}
      className={cn(
        "ll:grid ll:h-7 ll:min-w-0 ll:auto-cols-fr ll:grid-flow-col ll:bg-black/20",
        className,
      )}
      {...props}
    />
  );
}

export function SegmentedControlItem({
  className,
  ...props
}: ComponentProps<typeof Toggle>) {
  return (
    <Toggle
      className={cn(
        "ll:relative ll:flex ll:h-full ll:min-w-0 ll:items-center ll:justify-center ll:gap-1 ll:rounded-none ll:border-0 ll:bg-transparent ll:px-1 ll:py-0 ll:text-[11px] ll:font-semibold ll:leading-none ll:text-muted-foreground ll:transition-[color,background-color] ll:duration-150 ll:hover:bg-white/5 ll:hover:text-foreground ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring ll:data-pressed:bg-primary ll:data-pressed:text-primary-foreground ll:data-pressed:hover:bg-primary/90 ll-custom-cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
