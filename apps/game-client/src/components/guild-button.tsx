import { cn } from "cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FC, PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { UnreadDot } from "@/components/unread-dot";

type GuildButtonProps = PropsWithChildren<{
  isSelected: boolean;
  onClick: () => void;
  tooltipLabel: string;
  unreadLabel?: string | null;
}>;

const STRIP_CLASS_NAME =
  "ll:group ll:rounded-none ll:border-0 ll:border-l ll:border-solid ll:border-separator ll:bg-transparent ll:transition-[background-color] ll:motion-reduce:transition-none ll:hover:bg-white/5";

const STRIP_SELECTED_CLASS_NAME =
  "ll:after:pointer-events-none ll:after:absolute ll:after:inset-x-0 ll:after:bottom-0 ll:after:h-0.5 ll:after:bg-selected";

const IDLE_AVATAR_CLASS_NAME =
  "ll:opacity-50 ll:grayscale ll:transition-[opacity,filter] ll:motion-reduce:transition-none ll:group-hover:opacity-100 ll:group-hover:grayscale-0";

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
        <span
          className={cn(
            "ll:flex ll:size-full ll:items-center ll:justify-center",
            !isSelected && IDLE_AVATAR_CLASS_NAME,
          )}
        >
          {children}
        </span>
        {unreadLabel ? (
          <UnreadDot className="ll:absolute ll:right-px ll:top-px ll:ring-1 ll:ring-black/80" />
        ) : null}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p className="ll:font-semibold">{tooltipLabel}</p>
    </TooltipContent>
  </Tooltip>
);
