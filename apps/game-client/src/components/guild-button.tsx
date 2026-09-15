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
  unreadBadge?: string | null;
}>;

/** Flush tiles divided by hairlines, dimmed until hovered; the active one is bright and underlined. */
const STRIP_CLASS_NAME =
  "ll:rounded-none ll:border-0 ll:border-l ll:border-solid ll:border-gray-400/40 ll:bg-transparent ll:opacity-60 ll:transition-[opacity,background-color] ll:motion-reduce:transition-none ll:hover:bg-white/5 ll:hover:opacity-100";

const STRIP_SELECTED_CLASS_NAME =
  "ll:opacity-100 ll:after:pointer-events-none ll:after:absolute ll:after:inset-x-0 ll:after:bottom-0 ll:after:h-0.5 ll:after:bg-blue-400";

/** One tile of the guild switcher strip. */
export const GuildButton: FC<GuildButtonProps> = ({
  isSelected,
  onClick,
  tooltipLabel,
  unreadBadge,
  children,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="secondary"
        size="xs"
        type="button"
        onClick={onClick}
        aria-label={tooltipLabel}
        aria-pressed={isSelected}
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:flex ll:size-7 ll:shrink-0 ll:items-center ll:justify-center ll:overflow-visible ll:p-0",
          STRIP_CLASS_NAME,
          isSelected && STRIP_SELECTED_CLASS_NAME,
        )}
      >
        <Avatar className="ll:flex ll:size-full ll:items-center ll:justify-center ll:rounded-none">
          {children}
        </Avatar>
        {unreadBadge ? (
          <span className="ll:pointer-events-none ll:absolute ll:-right-2 ll:-top-2 ll:flex ll:h-3.5 ll:min-w-3.5 ll:items-center ll:justify-center ll:rounded-full ll:border ll:border-black/70 ll:bg-red-600 ll:px-0.5 ll:text-[8px] ll:font-bold ll:leading-none ll:text-white">
            {unreadBadge}
          </span>
        ) : null}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p className="ll:font-semibold">{tooltipLabel}</p>
    </TooltipContent>
  </Tooltip>
);
