import { cn } from "cn";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { CSSProperties, FC } from "react";

export type SettingsSaveBadgeStatus = "saving" | "saved" | "error";

/** Contextual icon entrance: scale 0.25, blur 4px, opacity 0 -> rest. */
export const SETTINGS_SAVE_ICON_ENTER_CLASS_NAME =
  "ll:flex ll:items-center ll:animate-in ll:fade-in-0 ll:zoom-in-[0.25] ll:blur-in-[4px] ll:duration-300 ll:ease-[cubic-bezier(0.2,0,0,1)]";

type SettingsSaveBadgeProps = {
  status: SettingsSaveBadgeStatus;
  className?: string;
  /** e.g. an `animationDelay` to stagger badges that appear together. */
  style?: CSSProperties;
};

/**
 * Small save indicator pinned to one item (a card, a row) while the title bar
 * indicator reports the whole queue. Decorative: the title bar carries the
 * live-region text, so this badge is hidden from assistive technology.
 */
export const SettingsSaveBadge: FC<SettingsSaveBadgeProps> = ({
  status,
  className,
  style,
}) => (
  <span
    key={status}
    aria-hidden
    style={style}
    className={cn(
      SETTINGS_SAVE_ICON_ENTER_CLASS_NAME,
      "ll:size-4 ll:justify-center ll:rounded-full ll:fill-mode-backwards",
      status === "error"
        ? "ll:bg-destructive ll:text-white"
        : status === "saved"
          ? "ll:bg-emerald-500 ll:text-white"
          : "ll:bg-black/60 ll:text-muted-foreground",
      className,
    )}
  >
    {status === "error" ? (
      <AlertCircle className="ll:size-3" strokeWidth={2} />
    ) : status === "saving" ? (
      <Loader2 className="ll:size-3 ll:animate-spin" strokeWidth={2} />
    ) : (
      <Check className="ll:size-3" strokeWidth={2.5} />
    )}
  </span>
);
