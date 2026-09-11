import { ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        className="ll:h-auto ll:min-w-0 ll:overflow-hidden ll:p-0.5 ll:hover:border-muted-foreground/50 ll:data-pressed:border-ring ll:data-pressed:bg-accent ll:data-pressed:ring-1 ll:data-pressed:ring-ring"
      >
        {children}
      </ToggleGroupItem>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <span className="ll:font-semibold">{label}</span>
    </TooltipContent>
  </Tooltip>
);
