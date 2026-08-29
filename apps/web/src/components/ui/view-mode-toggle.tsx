import { useState } from "react";
import { Grid2X2, List, type LucideIcon } from "lucide-react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import type { ViewMode } from "@/hooks/use-view-mode";
import { ThemeInteractiveFrame } from "@/themes";

const VIEW_MODES = [
  { value: "list", icon: List },
  { value: "grid", icon: Grid2X2 },
] satisfies ReadonlyArray<{ value: ViewMode; icon: LucideIcon }>;

type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  listLabel: string;
  gridLabel: string;
  className?: string;
};

export function ViewModeToggle({
  value,
  onChange,
  listLabel,
  gridLabel,
  className,
}: ViewModeToggleProps) {
  const [hoveredMode, setHoveredMode] = useState<ViewMode | null>(null);
  const labels: Record<ViewMode, string> = {
    list: listLabel,
    grid: gridLabel,
  };

  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(nextValue) => {
        const nextMode = nextValue[0];
        if (nextMode) {
          onChange(nextMode as ViewMode);
        }
      }}
      aria-label={`${listLabel} / ${gridLabel}`}
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-border bg-background/35 p-0.5",
        className,
      )}
    >
      {VIEW_MODES.map(({ value: mode, icon: Icon }) => (
        <Tooltip key={mode}>
          <TooltipTrigger
            render={
              <ToggleGroupItem
                value={mode}
                onMouseEnter={() => setHoveredMode(mode)}
                onMouseLeave={() => setHoveredMode(null)}
                aria-label={labels[mode]}
                className="size-8 p-0 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                <ThemeInteractiveFrame
                  isHovered={hoveredMode === mode}
                  isActive={value === mode}
                >
                  <Icon className="size-4" />
                </ThemeInteractiveFrame>
              </ToggleGroupItem>
            }
          />
          <TooltipContent side="bottom">
            <p>{labels[mode]}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
