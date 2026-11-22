import { cn } from "cn";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { CSSProperties, FC } from "react";
import type { SettingsSaveMarkStatus } from "@/lib/settings-persistence/settings-save-status.store";

export const SETTINGS_SAVE_ICON_ENTER_CLASS_NAME =
  "ll:flex ll:items-center ll:animate-in ll:fade-in-0 ll:zoom-in-[0.25] ll:blur-in-[4px] ll:duration-long ll:ease-enter";

type SettingsSaveBadgeProps = {
  status: SettingsSaveMarkStatus;
  className?: string;
  style?: CSSProperties;
};

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
