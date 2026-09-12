import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import { Button } from "@/components/ui/button";
import { SETTINGS_SAVE_ICON_ENTER_CLASS_NAME } from "@/components/settings/settings-save-badge";
import { cn } from "cn";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

const SAVED_VISIBLE_MS = 1500;

const LABEL_ENTER_CLASS_NAME = "ll:animate-in ll:fade-in-0 ll:duration-150";

/** Title bar indicator for the shared settings write queue. */
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

  return (
    <div
      role="status"
      aria-live="polite"
      data-ll-draggable="false"
      className="ll:flex ll:h-5 ll:items-center ll:gap-1 ll:text-xs ll:leading-none"
    >
      {visible ? (
        <>
          <span key={status} className={SETTINGS_SAVE_ICON_ENTER_CLASS_NAME}>
            {status === "error" ? (
              <AlertCircle
                className="ll:size-3.5 ll:text-destructive"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : status === "saving" ? (
              <Loader2
                className="ll:size-3.5 ll:animate-spin ll:text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : (
              <Check
                className="ll:size-3.5 ll:text-emerald-300"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            )}
          </span>
          <span
            key={`${status}-label`}
            className={cn(
              LABEL_ENTER_CLASS_NAME,
              status === "error"
                ? "ll:text-destructive"
                : "ll:text-muted-foreground",
            )}
          >
            {t(`saveStatus.${status}`)}
          </span>
          {status === "error" && retry ? (
            <Button
              variant="link"
              size="xs"
              onClick={retry}
              className="ll:h-4 ll:px-1 ll:font-semibold"
            >
              {t("saveStatus.retry")}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
