import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { RotateCcw } from "lucide-react";
import { Fragment, type FC } from "react";

type SettingsKeybindFieldProps = {
  /** Key caps of the binding, e.g. ["Ctrl", "K"]. */
  keys: string[];
  capturing: boolean;
  captureLabel: string;
  /** Accessible name of the capture button, e.g. "Zmień skrót: Chat". */
  label: string;
  /** Shows the reset action; its space is always reserved. */
  modified: boolean;
  resetLabel: string;
  onCaptureToggle: () => void;
  onReset: () => void;
  className?: string;
};

/**
 * Keybind control: an input-like field showing the binding as key caps. Click
 * to record the next key or mouse press; while recording the field pulses and
 * shows the prompt. The reset slot keeps its width even when hidden, so rows
 * line up regardless of which bindings were changed.
 */
export const SettingsKeybindField: FC<SettingsKeybindFieldProps> = ({
  keys,
  capturing,
  captureLabel,
  label,
  modified,
  resetLabel,
  onCaptureToggle,
  onReset,
  className,
}) => (
  <span
    className={cn(
      "ll:inline-flex ll:w-full ll:items-center ll:gap-1",
      className,
    )}
  >
    <button
      type="button"
      aria-label={label}
      aria-pressed={capturing}
      onClick={onCaptureToggle}
      className={cn(
        "ll-custom-cursor-pointer ll:group/keybind ll:flex ll:h-7 ll:min-w-0 ll:flex-1 ll:items-center ll:justify-center ll:gap-1 ll:rounded-sm ll:border ll:border-input ll:bg-input/30 ll:px-1.5 ll:text-[11px] ll:text-gray-100 ll:transition-[border-color,box-shadow,background-color] ll:hover:border-ring/60 ll:hover:bg-input/50 ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50",
        capturing &&
          "ll:border-dashed ll:border-primary ll:bg-primary/10 ll:text-primary ll:hover:border-primary",
      )}
    >
      {capturing ? (
        <>
          <span
            aria-hidden
            className="ll:size-1.5 ll:shrink-0 ll:rounded-full ll:bg-primary ll:motion-safe:animate-pulse"
          />
          <span className="ll:truncate">{captureLabel}</span>
        </>
      ) : (
        keys.map((key, index) => (
          <Fragment key={`${index}-${key}`}>
            {index > 0 ? (
              <span aria-hidden className="ll:text-muted-foreground">
                +
              </span>
            ) : null}
            <kbd className="ll:min-w-5 ll:truncate ll:rounded-xs ll:border ll:border-white/15 ll:bg-white/10 ll:px-1 ll:py-px ll:text-center ll:font-sans ll:text-[11px] ll:leading-4 ll:shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]">
              {key}
            </kbd>
          </Fragment>
        ))
      )}
    </button>
    <span className="ll:flex ll:size-6 ll:shrink-0 ll:items-center ll:justify-center">
      {modified ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={resetLabel}
              onClick={onReset}
              className="ll:text-gray-300 ll:hover:text-gray-100"
            >
              <RotateCcw aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{resetLabel}</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  </span>
);
