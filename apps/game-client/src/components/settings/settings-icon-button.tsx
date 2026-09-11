import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { forwardRef, type ComponentProps } from "react";

type SettingsIconButtonProps = Omit<ComponentProps<"button">, "aria-label"> & {
  /** Accessible name; also the tooltip text. */
  label: string;
  variant?: "default" | "destructive";
};

/**
 * Icon-only action for list rows and toolbars (copy, restore, remove).
 * The label is announced to assistive tech and shown as a tooltip.
 */
export const SettingsIconButton = forwardRef<
  HTMLButtonElement,
  SettingsIconButtonProps
>(function SettingsIconButton(
  { label, variant = "default", className, children, onMouseDown, ...props },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          onMouseDown={(event) => {
            event.stopPropagation();
            onMouseDown?.(event);
          }}
          className={cn(
            "ll-custom-cursor-pointer ll:flex ll:size-6 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:transition-colors ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:disabled:cursor-not-allowed ll:disabled:opacity-50 ll:[&_svg]:size-3.5",
            variant === "default"
              ? "ll:text-gray-300 ll:hover:bg-white/5 ll:hover:text-gray-100"
              : "ll:text-destructive ll:hover:bg-destructive/10",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
});
