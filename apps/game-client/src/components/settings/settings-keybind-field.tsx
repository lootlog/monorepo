import { HotkeyCaps } from "@/components/hotkey-caps";
import type { HotkeyBinding } from "@/store/hotkeys.store";
import { cn } from "cn";
import { RotateCcw } from "lucide-react";
import type { FC } from "react";
import { SettingsIconButton } from "./settings-icon-button";

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
  /** Timestamp of the last capture that set `binding`; pops the caps in. */
  assignedAt?: number;
  className?: string;
};

/**
 * Keybind control: an input-like field showing the binding as key caps. Click
 * to record the next key or mouse press; while recording the field's outline
 * breathes and it shows the prompt; a freshly captured binding pops in. The reset slot sits before the field and keeps its width
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
  assignedAt,
  className,
}) => (
  <span
    className={cn(
      "ll:inline-flex ll:w-48 ll:max-w-full ll:items-center ll:justify-end ll:gap-1",
      className,
    )}
  >
    <span className="ll:flex ll:size-6 ll:shrink-0 ll:items-center ll:justify-center">
      {modified ? (
        <SettingsIconButton label={resetLabel} onClick={onReset}>
          <RotateCcw aria-hidden />
        </SettingsIconButton>
      ) : null}
    </span>
    <button
      type="button"
      aria-label={label}
      aria-pressed={capturing}
      onClick={onCaptureToggle}
      className={cn(
        "ll-custom-cursor-pointer ll:group/keybind ll:flex ll:h-8 ll:min-w-0 ll:flex-1 ll:items-center ll:justify-center ll:gap-1 ll:rounded-sm ll:border ll:border-input ll:bg-input/30 ll:px-1.5 ll:text-xs ll:text-foreground ll:transition-[border-color,box-shadow,background-color] ll:hover:border-ring/60 ll:hover:bg-input/50 ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50",
        capturing &&
          "ll-keybind-breathe ll:border-dashed ll:border-primary ll:bg-primary/10 ll:text-primary ll:hover:border-primary",
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
          key={assignedAt}
          binding={binding}
          className={cn(
            assignedAt !== undefined &&
              "ll:animate-in ll:fade-in-0 ll:zoom-in-75 ll:duration-200 ll:ease-[cubic-bezier(0.2,0,0,1)]",
          )}
          kbdClassName="ll:h-4 ll:bg-white/10 ll:text-foreground ll:shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]"
        />
      )}
    </button>
  </span>
);
