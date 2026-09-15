import { cn } from "cn";
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
  unreadBadge?: string | null;
  /** `strip` renders a flush tab-like tile for the guild switcher strip. */
  variant?: "default" | "strip";
}>;

const DEFAULT_CLASS_NAME = cn(
  "ll:rounded-sm ll:border-2",
  "ll:transition-[transform,box-shadow,border-color,background-color,opacity]",
  "hover:ll:scale-105",
  "ll:border-gray-700/90 ll:bg-gray-900/60 hover:ll:border-gray-500 hover:ll:bg-gray-800/70",
  "after:ll:pointer-events-none after:ll:absolute after:ll:inset-0 after:ll:rounded-[2px] after:ll:opacity-0 after:ll:transition-opacity",
);

const DEFAULT_SELECTED_CLASS_NAME =
  "ll:border-ring ll:bg-accent ll:ring-1 ll:ring-ring after:ll:bg-primary/15 after:ll:opacity-100";

/** Flush tiles divided by hairlines, dimmed until hovered; the active one is bright and underlined. */
const STRIP_CLASS_NAME =
  "ll:rounded-none ll:border-0 ll:border-l ll:border-solid ll:border-gray-400/40 ll:bg-transparent ll:opacity-60 ll:transition-[opacity,background-color] ll:motion-reduce:transition-none ll:hover:bg-white/5 ll:hover:opacity-100";

const STRIP_SELECTED_CLASS_NAME =
  "ll:opacity-100 ll:after:pointer-events-none ll:after:absolute ll:after:inset-x-0 ll:after:bottom-0 ll:after:h-0.5 ll:after:bg-blue-400";

export const GuildButton: FC<GuildButtonProps> = ({
  className,
  isSelected,
  disabled,
  onClick,
  tooltipLabel,
  unreadBadge,
  variant = "default",
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="secondary"
        size="xs"
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltipLabel}
        aria-pressed={isSelected}
        className={cn(
          "ll:relative ll:flex ll:items-center ll:justify-center ll:overflow-visible",
          "disabled:ll:opacity-50 disabled:ll:cursor-not-allowed",
          "ll:size-7 ll:p-0 ll:shrink-0",
          variant === "strip" ? STRIP_CLASS_NAME : DEFAULT_CLASS_NAME,
          !disabled && "ll-custom-cursor-pointer",
          isSelected &&
            (variant === "strip"
              ? STRIP_SELECTED_CLASS_NAME
              : DEFAULT_SELECTED_CLASS_NAME),
          className,
        )}
      >
        <Avatar
          className={cn(
            "ll:size-full ll:flex ll:items-center ll:justify-center",
            variant === "strip" && "ll:rounded-none",
          )}
        >
          {children}
        </Avatar>
        {unreadBadge ? (
          <span className="ll:pointer-events-none ll:absolute ll:-right-2 ll:-top-2 ll:flex ll:h-3.5 ll:min-w-3.5 ll:items-center ll:justify-center ll:rounded-full ll:border ll:border-black/70 ll:bg-red-600 ll:px-0.5 ll:text-[8px] ll:font-bold ll:leading-none ll:text-white">
            {unreadBadge}
          </span>
        ) : null}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="ll:z-500">
      <p className="ll:text-xs ll:font-semibold">{tooltipLabel}</p>
    </TooltipContent>
  </Tooltip>
);
