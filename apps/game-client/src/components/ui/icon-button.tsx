import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type IconButtonProps = Omit<
  ComponentProps<typeof Button>,
  "aria-label" | "aria-pressed" | "size" | "variant" | "children"
> & {
  /** Accessible name; also the tooltip unless `tooltip` is given. */
  label: string;
  /** Richer tooltip content, e.g. the label with its hotkey. */
  tooltip?: ReactNode;
  /** The icon. */
  children: ReactNode;
  /**
   * Marks a toggle as on (`aria-pressed`). Popup triggers leave it unset:
   * their `aria-expanded` lights the button the same way.
   */
  active?: boolean;
  variant?: "quiet" | "quiet-destructive";
};

/**
 * The one icon-only action of the game client: title bars, toolbars, the
 * quick access bar and list rows. 24×24 px, so every icon meets the WCAG 2.2
 * minimum target size. Extra props (including `ref` and popup trigger props)
 * reach the button so it can be a `PopoverTrigger` render target.
 */
export const IconButton = ({
  label,
  tooltip,
  children,
  active,
  variant = "quiet",
  ...props
}: IconButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant={variant}
        size="icon-xs"
        data-ll-draggable="false"
        aria-label={label}
        aria-pressed={active}
        {...props}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{tooltip ?? label}</TooltipContent>
  </Tooltip>
);
