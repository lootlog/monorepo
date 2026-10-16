import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";

type FilterChipTriggerProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size" | "children" | "icon"
> & {
  icon?: LucideIcon;
  /** Replaces the icon, such as a character's avatar. */
  media?: ReactNode;
  /** The filter's name, shown muted before its value; omit for a self-named control. */
  label?: string;
  /** Omit while nothing is chosen: the name alone reads as the control. */
  value?: ReactNode;
  /** The filter narrows the results; the chip takes the accent. */
  active?: boolean;
};

/**
 * The trigger of one filter in a filter bar: its name and value with a
 * chevron, quiet until the filter is set.
 */
export function FilterChipTrigger({
  icon: Icon,
  media,
  label,
  value,
  active = false,
  className,
  ...props
}: FilterChipTriggerProps) {
  return (
    <Button
      variant="chip"
      size="lg"
      data-active={active || undefined}
      className={cn("max-w-80 min-w-0", className)}
      {...props}
    >
      {media ??
        (Icon && (
          <Icon
            className={cn(!active && "text-muted-foreground")}
            aria-hidden="true"
          />
        ))}
      {label && value !== undefined && (
        <span
          className={cn(
            "shrink-0 font-normal",
            active ? "text-primary/75" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      )}
      <span className="min-w-0 truncate">{value ?? label}</span>
      <ChevronDown
        className={cn("opacity-60", !active && "text-muted-foreground")}
        aria-hidden="true"
      />
    </Button>
  );
}
