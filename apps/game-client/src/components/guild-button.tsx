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
  isSelected: boolean;
  onClick: () => void;
  tooltipLabel: string;
  unreadLabel?: string | null;
}>;

/** Flush tiles divided by hairlines. */
const STRIP_CLASS_NAME =
  "ll:group ll:rounded-none ll:border-0 ll:border-l ll:border-solid ll:border-gray-400/40 ll:bg-transparent ll:transition-[background-color] ll:motion-reduce:transition-none ll:hover:bg-white/5";

/** The active tile carries a blue rule along its bottom edge. */
const STRIP_SELECTED_CLASS_NAME =
  "ll:after:pointer-events-none ll:after:absolute ll:after:inset-x-0 ll:after:bottom-0 ll:after:h-0.5 ll:after:bg-blue-400";

/**
 * Idle artwork is dimmed and desaturated until the tile is hovered, so the one
 * coloured icon reads as active. Only the avatar is filtered: the unread dot
 * sits above it and keeps its red.
 */
const IDLE_AVATAR_CLASS_NAME =
  "ll:opacity-50 ll:grayscale ll:transition-[opacity,filter] ll:motion-reduce:transition-none ll:group-hover:opacity-100 ll:group-hover:grayscale-0";

/** One tile of the guild switcher strip. */
export const GuildButton: FC<GuildButtonProps> = ({
  isSelected,
  onClick,
  tooltipLabel,
  unreadLabel,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="secondary"
        size="xs"
        type="button"
        onClick={onClick}
        aria-label={
          unreadLabel ? `${tooltipLabel} – ${unreadLabel}` : tooltipLabel
        }
        aria-pressed={isSelected}
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:flex ll:size-7 ll:shrink-0 ll:items-center ll:justify-center ll:overflow-visible ll:p-0",
          STRIP_CLASS_NAME,
          isSelected && STRIP_SELECTED_CLASS_NAME,
        )}
      >
        <Avatar
          className={cn(
            "ll:flex ll:size-full ll:items-center ll:justify-center ll:rounded-none",
            !isSelected && IDLE_AVATAR_CLASS_NAME,
          )}
        >
          {children}
        </Avatar>
        {/* The dot stays inside the tile: the strip scrolls and clips anything
            that reaches past the tile's edges. */}
        {unreadLabel ? (
          <span
            aria-hidden
            className="ll:pointer-events-none ll:absolute ll:right-px ll:top-px ll:size-2 ll:rounded-full ll:bg-red-500"
          />
        ) : null}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p className="ll:font-semibold">{tooltipLabel}</p>
    </TooltipContent>
  </Tooltip>
);
