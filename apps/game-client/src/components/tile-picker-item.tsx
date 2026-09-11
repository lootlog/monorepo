import { ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type TilePickerItemProps = {
  value: string;
  /** Accessible name, also shown in the tooltip. */
  label: string;
  /** Decorative tile content, e.g. a sprite or an avatar. */
  children: ReactNode;
};

export const TilePickerItem: FC<TilePickerItemProps> = ({
  value,
  label,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <ToggleGroupItem
        value={value}
        aria-label={label}
        className={cn(
          "ll:h-auto ll:min-w-0 ll:overflow-hidden ll:border-0 ll:p-0",
          "ll:ring-1 ll:ring-input ll:hover:ring-muted-foreground/60",
          "ll:data-pressed:bg-accent ll:data-pressed:ring-2 ll:data-pressed:ring-selected",
          // Focus uses an outline so it never hides the selection ring.
          "ll:focus-visible:ring-1 ll:focus-visible:ring-input ll:focus-visible:outline-2 ll:focus-visible:outline-offset-2 ll:focus-visible:outline-ring",
        )}
      >
        {children}
      </ToggleGroupItem>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <span className="ll:font-semibold">{label}</span>
    </TooltipContent>
  </Tooltip>
);
