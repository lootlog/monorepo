import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type WindowActionButtonProps = {
  /** Accessible name; also the tooltip unless `tooltip` overrides it. */
  label: string;
  tooltip?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
  /** Marks a toggle as on: highlighted icon plus `aria-pressed`. */
  pressed?: boolean;
  /** Close-style action: hover turns red instead of neutral. */
  destructive?: boolean;
  className?: string;
};

/**
 * Icon button used in draggable window title bars and their toolbars. The
 * 24px hit area is larger than the 14px glyph so players can hit it without
 * aiming, and `data-ll-draggable="false"` keeps a press from starting a drag.
 */
export const WindowActionButton: FC<WindowActionButtonProps> = ({
  label,
  tooltip,
  onClick,
  children,
  pressed,
  destructive = false,
  className,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        data-ll-draggable="false"
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:inline-flex ll:size-6 ll:shrink-0 ll:appearance-none ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-gray-300 ll:transition-colors ll:duration-100 ll:outline-none ll:focus-visible:ring-2 ll:focus-visible:ring-blue-400/70",
          pressed
            ? "ll:bg-blue-400/15 ll:text-blue-200 ll:hover:bg-blue-400/25 ll:hover:text-blue-100"
            : destructive
              ? "ll:hover:bg-red-500/25 ll:hover:text-red-100"
              : "ll:hover:bg-white/10 ll:hover:text-gray-50",
          className,
        )}
        onClick={onClick}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{tooltip ?? label}</TooltipContent>
  </Tooltip>
);
