import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";

type SettingsKeybindFieldProps = {
  /** Formatted binding, e.g. "Ctrl + K". */
  binding: string;
  capturing: boolean;
  captureLabel: string;
  /** Accessible name of the capture button, e.g. "Zmień skrót: Chat". */
  label: string;
  /** Shown only when the binding differs from its default. */
  modified: boolean;
  resetLabel: string;
  onCaptureToggle: () => void;
  onReset: () => void;
  className?: string;
};

/**
 * Keybind control: an input-styled button that shows the current combination
 * as a key cap and records the next key/mouse press when active. A small
 * reset icon appears only when the binding was changed.
 */
export const SettingsKeybindField: FC<SettingsKeybindFieldProps> = ({
  binding,
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
      "ll:inline-flex ll:w-full ll:items-center ll:justify-end ll:gap-1",
      className,
    )}
  >
    <button
      type="button"
      aria-label={label}
      aria-pressed={capturing}
      onClick={onCaptureToggle}
      className={cn(
        "ll-custom-cursor-pointer ll:flex ll:h-6 ll:min-w-0 ll:flex-1 ll:items-center ll:justify-center ll:rounded-sm ll:border ll:border-input ll:bg-black/25 ll:px-2 ll:text-[11px] ll:text-gray-100 ll:transition-[border-color,box-shadow] ll:hover:bg-white/5 ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50",
        capturing &&
          "ll:border-primary ll:text-primary ll:ring-[3px] ll:ring-primary/30 ll:motion-safe:animate-pulse",
      )}
    >
      {capturing ? (
        <span className="ll:truncate">{captureLabel}</span>
      ) : (
        <kbd className="ll:font-sans ll:truncate ll:rounded-xs ll:bg-white/10 ll:px-1 ll:py-px ll:text-[11px] ll:leading-4">
          {binding}
        </kbd>
      )}
    </button>
    {modified ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={resetLabel}
            onClick={onReset}
            className="ll-custom-cursor-pointer ll:flex ll:size-6 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-gray-300 ll:transition-colors ll:hover:bg-white/5 ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
          >
            <RotateCcw className="ll:size-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>{resetLabel}</TooltipContent>
      </Tooltip>
    ) : null}
  </span>
);
