import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type TilePickerProps = {
  children: ReactNode;
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  "aria-label"?: string;
  className?: string;
  /** Padding around the tiles, inside the scroll viewport. */
  contentClassName?: string;
  disabled?: boolean;
  multiple?: boolean;
  /** Gap between tiles, in spacing units. */
  spacing?: number;
};

/**
 * Row of `TilePickerItem`s. The row never wraps; longer lists scroll
 * horizontally (the mouse wheel scrolls it too). The spacing and inner padding
 * keep the items' selection rings and focus outlines clear of their neighbours
 * and the scroll viewport edge.
 */
export const TilePicker: FC<TilePickerProps> = ({
  children,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
  contentClassName,
  disabled,
  multiple,
  spacing = 1.5,
}) => (
  <TooltipProvider>
    <ScrollArea
      data-slot="tile-picker"
      orientation="horizontal"
      className={cn("ll:w-full", className)}
    >
      <ToggleGroup
        aria-label={ariaLabel}
        variant="outline"
        spacing={spacing}
        multiple={multiple}
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        className={cn("ll:w-max ll:p-1.5 ll:pb-3", contentClassName)}
      >
        {children}
      </ToggleGroup>
    </ScrollArea>
  </TooltipProvider>
);
