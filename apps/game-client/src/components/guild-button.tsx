import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";
import type { FC, PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";

type GuildButtonProps = PropsWithChildren<{
  className?: string;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
  tooltipLabel: string;
}>;

export const GuildButton: FC<GuildButtonProps> = ({
  className,
  isSelected,
  disabled,
  onClick,
  tooltipLabel,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isSelected}
        className={cn(
          "ll:relative ll:flex ll:items-center ll:justify-center ll:overflow-visible ll:rounded-sm ll:border-2",
          "ll:transition-[transform,box-shadow,border-color,background-color,opacity]",
          "hover:ll:scale-105",
          "disabled:ll:opacity-50 disabled:ll:cursor-not-allowed",
          "ll:size-7 ll:p-0 ll:shrink-0",
          "ll:border-gray-700/90 ll:bg-gray-900/60 hover:ll:border-gray-500 hover:ll:bg-gray-800/70",
          "after:ll:pointer-events-none after:ll:absolute after:ll:inset-0 after:ll:rounded-[2px] after:ll:opacity-0 after:ll:transition-opacity",
          !disabled && "ll-custom-cursor-pointer",
          {
            "ll:border-sky-400 ll:bg-sky-500/12 ll:ring-1 ll:ring-sky-300/75 ll:shadow-[0_0_0_1px_rgba(96,165,250,0.45),0_0_14px_rgba(59,130,246,0.28)] after:ll:bg-sky-300/18 after:ll:opacity-100":
              isSelected,
          },
          className,
        )}
      >
        <Avatar className="ll:size-full ll:flex ll:items-center ll:justify-center">
          {children}
        </Avatar>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="ll:z-500">
      <p className="ll:text-xs ll:font-semibold">{tooltipLabel}</p>
    </TooltipContent>
  </Tooltip>
);
