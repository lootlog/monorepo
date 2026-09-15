import { cn } from "cn";
import type { ComponentProps, FC, ReactNode } from "react";
import { HotkeyCaps } from "@/components/hotkey-caps";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HotkeyBinding } from "@/store/hotkeys.store";

export type QuickAccessButtonProps = Omit<
  ComponentProps<"button">,
  "children"
> & {
  /** Accessible name; also the tooltip's first line. */
  label: string;
  icon: ReactNode;
  /** Lit when the window this button toggles is open. */
  active?: boolean;
  /** Shown as key caps under the label; hidden when unassigned. */
  binding?: HotkeyBinding;
};

const isAssigned = (
  binding: HotkeyBinding | undefined,
): binding is HotkeyBinding =>
  binding !== undefined && (binding.type === "mouse" || binding.key !== "");

/**
 * One taskbar-style tile of the quick access bar. Extra props (including
 * `ref` and popover trigger props) go straight to the button so it can serve
 * as a `PopoverTrigger` render target.
 */
export const QuickAccessButton: FC<QuickAccessButtonProps> = ({
  label,
  icon,
  active = false,
  binding,
  className,
  onMouseDown,
  ...buttonProps
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        data-ll-draggable="false"
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:inline-flex ll:h-6 ll:w-7 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-white/10 ll:hover:text-white ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:[&_svg]:pointer-events-none ll:[&_svg]:shrink-0",
          active ? "ll:bg-white/15 ll:text-white" : "ll:text-gray-300",
          className,
        )}
        onMouseDown={(event) => {
          // Buttons live inside a draggable window; a press must not start a drag.
          event.stopPropagation();
          onMouseDown?.(event);
        }}
        {...buttonProps}
      >
        {icon}
        {active ? (
          <span
            aria-hidden="true"
            className="ll:absolute ll:inset-x-1.5 ll:bottom-0 ll:h-0.5 ll:rounded-full ll:bg-blue-400"
          />
        ) : null}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <div className="ll:flex ll:items-center ll:gap-2">
        <span>{label}</span>
        {isAssigned(binding) ? <HotkeyCaps binding={binding} /> : null}
      </div>
    </TooltipContent>
  </Tooltip>
);
