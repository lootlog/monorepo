import { cn } from "cn";
import type { FC, ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TimersToolbarButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Highlights the button while the toggle it controls is on. */
  active?: boolean;
};

/** Icon-only window toolbar action; every timers toolbar icon shares this hit area and colors. */
export const TimersToolbarButton: FC<TimersToolbarButtonProps> = ({
  label,
  icon,
  onClick,
  active = false,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "ll-custom-cursor-pointer ll:inline-flex ll:size-4 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:transition-colors ll:motion-reduce:transition-none ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring",
          active ? "ll:text-blue-400" : "ll:text-gray-300",
        )}
      >
        {icon}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);
