import { HotkeyCaps } from "@/components/hotkey-caps";
import { Button } from "@/components/ui/button";
import type { HotkeyBinding } from "@/store/hotkeys.store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";

type SettingsKeybindFieldProps = {
  binding: HotkeyBinding;
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
 * shows the prompt. The reset slot sits before the field and keeps its width
 * even when hidden, so every field ends at the same right edge.
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
      "ll:inline-flex ll:items-center ll:justify-end ll:gap-1",
      className,
    )}
  >
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
    <button
      type="button"
      aria-label={label}
      aria-pressed={capturing}
      onClick={onCaptureToggle}
      className={cn(
        "ll-custom-cursor-pointer ll:group/keybind ll:flex ll:h-7 ll:w-28 ll:min-w-0 ll:items-center ll:justify-center ll:gap-1 ll:rounded-sm ll:border ll:border-input ll:bg-input/30 ll:px-1.5 ll:text-[11px] ll:text-gray-100 ll:transition-[border-color,box-shadow,background-color] ll:hover:border-ring/60 ll:hover:bg-input/50 ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50",
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
        <HotkeyCaps
          binding={binding}
          kbdClassName="ll:h-4 ll:bg-white/10 ll:text-gray-100 ll:shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]"
        />
      )}
    </button>
  </span>
);
