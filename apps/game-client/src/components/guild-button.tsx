import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";
import type { FC, PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";

export type GuildButtonProps = PropsWithChildren<{
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
  tooltipLabel: string;
}>;

export const GuildButton: FC<GuildButtonProps> = ({
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
        className={cn(
          "ll:flex ll:items-center ll:justify-center ll:transition-all ll:border-2 ll:rounded-sm",
          "hover:ll:scale-105",
          "disabled:ll:opacity-50 disabled:ll:cursor-not-allowed",
          "ll:size-7 ll:p-0 ll:shrink-0",
          "ll:border-gray-600 ll:bg-gray-800/50 hover:ll:border-muted/20",
          !disabled && "ll-custom-cursor-pointer",
          {
            "ll:border-primary ll:bg-blue-600/20 ll:shadow-primary/50":
              isSelected,
          },
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
