import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

type AnimatedToggleGroupProps<Value extends string> = {
  label: string;
  value: Value;
  onValueChange: (value: Value) => void;
  options: readonly {
    value: Value;
    label: string;
    disabled?: boolean;
    icon?: LucideIcon;
  }[];
  className?: string;
  static?: boolean;
  size?: "default" | "small";
};

export function AnimatedToggleGroup<Value extends string>({
  label,
  value,
  onValueChange,
  options,
  static: isStatic = false,
  size = "default",
  className,
}: AnimatedToggleGroupProps<Value>) {
  const selectedIndex = options.findIndex((option) => option.value === value);
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(values) => {
        const option = options.find((item) => item.value === values[0]);
        if (option && !option.disabled) onValueChange(option.value);
      }}
      spacing={0}
      className={cn(
        "relative isolate grid max-w-full rounded-xl border border-border bg-background",
        size === "small" ? "h-7" : "h-9",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {selectedIndex >= 0 && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 -z-10 rounded-[inherit] bg-primary",
            !isStatic &&
              "transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
          )}
          style={{
            width: `${100 / options.length}%`,
            transform: `translateX(${selectedIndex * 100}%)`,
          }}
        />
      )}
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={option.label}
          title={option.icon ? option.label : undefined}
          className={cn(
            "min-w-0 cursor-pointer disabled:cursor-default bg-transparent hover:bg-transparent aria-pressed:bg-transparent aria-pressed:text-primary-foreground data-[state=on]:bg-transparent transition-[color,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
            "h-full",
            !isStatic && "active:scale-[0.96] motion-reduce:active:scale-100",
          )}
        >
          {option.icon ? <option.icon className="size-4" /> : option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
