import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import { SettingsSaveBadge } from "@/components/settings/settings-save-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

const SAVED_VISIBLE_MS = 1500;

/**
 * Title bar indicator for the shared settings write queue: a small badge next
 * to the window title (spinner, green check, red error). The label lives in
 * the tooltip and a visually hidden live region; a failed save turns the
 * badge into a retry button.
 */
export const SettingsSaveStatus: FC = () => {
  const { t } = useTranslation("settings");
  const status = useSettingsSaveStatusStore((state) => state.status);
  const savedAt = useSettingsSaveStatusStore((state) => state.savedAt);
  const retry = useSettingsSaveStatusStore((state) => state.retry);
  // The "saved" confirmation hides itself after a moment; the timeout records
  // which save it already hid so the value derives from state during render.
  const [hiddenSavedAt, setHiddenSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "saved" || savedAt === null) return;

    const timeoutId = window.setTimeout(
      () => setHiddenSavedAt(savedAt),
      SAVED_VISIBLE_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [savedAt, status]);

  const visible =
    status === "saving" ||
    status === "error" ||
    (status === "saved" && savedAt !== null && savedAt !== hiddenSavedAt);

  const label = visible ? t(`saveStatus.${status}`) : null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-ll-draggable="false"
      className="ll:flex ll:size-4 ll:shrink-0 ll:items-center ll:justify-center"
    >
      {visible ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {status === "error" && retry ? (
              <button
                type="button"
                aria-label={t("saveStatus.retry")}
                className="ll-custom-cursor-pointer ll:flex ll:appearance-none ll:rounded-full ll:border-0 ll:bg-transparent ll:p-0 ll:outline-none ll:focus-visible:ring-2 ll:focus-visible:ring-blue-400/70"
                onClick={retry}
              >
                <SettingsSaveBadge status={status} />
              </button>
            ) : (
              <span className="ll:flex">
                <SettingsSaveBadge status={status} />
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {status === "error" && retry
              ? `${label}. ${t("saveStatus.retryHint")}`
              : label}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {label ? <span className="ll:sr-only">{label}</span> : null}
    </div>
  );
};
