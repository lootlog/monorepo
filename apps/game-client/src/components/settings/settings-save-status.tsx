import { settingsPatchQueue } from "@/features/settings/persistence/settings-patch-client";
import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

const SAVED_VISIBLE_MS = 1500;

/** Contextual icon entrance: scale 0.25, blur 4px, opacity 0 -> rest. */
const ICON_ENTER_CLASS_NAME =
  "ll:flex ll:items-center ll:animate-in ll:fade-in-0 ll:zoom-in-[0.25] ll:blur-in-[4px] ll:duration-300 ll:ease-[cubic-bezier(0.2,0,0,1)]";

const LABEL_ENTER_CLASS_NAME = "ll:animate-in ll:fade-in-0 ll:duration-150";

/** Title bar indicator for the shared settings write queue. */
export const SettingsSaveStatus: FC = () => {
  const { t } = useTranslation("settings");
  const status = useSettingsSaveStatusStore((state) => state.status);
  const savedAt = useSettingsSaveStatusStore((state) => state.savedAt);
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
      className="ll:flex ll:h-5 ll:items-center ll:gap-1 ll:text-[11px] ll:leading-none"
    >
      {visible ? (
        <>
          <span key={status} className={ICON_ENTER_CLASS_NAME}>
            {status === "error" ? (
              <AlertCircle
                className="ll:size-3.5 ll:text-red-300"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : status === "saving" ? (
              <Loader2
                className="ll:size-3.5 ll:animate-spin ll:text-gray-300"
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
              status === "error" ? "ll:text-red-200" : "ll:text-gray-300",
            )}
          >
            {t(`saveStatus.${status}`)}
          </span>
          {status === "error" ? (
            <Button
              onClick={() => void settingsPatchQueue.retry()}
              className="ll:h-4 ll:px-1.5 ll:text-[11px] ll:font-semibold ll:leading-none ll:transition-[color,background-color,scale] ll:duration-150 ll:ease-out ll:active:scale-[0.96]"
            >
              {t("saveStatus.retry")}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
