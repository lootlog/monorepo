import { cn } from "cn";
import type { FC, ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type WindowActionButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  /** Highlights the button while the toggle it controls is on. */
  active?: boolean;
  className?: string;
};

/** Icon-only action for window title bars and toolbars; every window shares this hit area and colors. */
export const WindowActionButton: FC<WindowActionButtonProps> = ({
  label,
  onClick,
  children,
  active,
  className,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        data-ll-draggable="false"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "ll-custom-cursor-pointer ll:inline-flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-white/10 ll:hover:text-white ll:focus-visible:outline-2 ll:focus-visible:outline-ring",
          active ? "ll:text-blue-400" : "ll:text-gray-300",
          className,
        )}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);
