import { settingsPatchQueue } from "@/features/settings/persistence/settings-patch-client";
import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

const SAVED_VISIBLE_MS = 1500;

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
      {!visible ? null : status === "error" ? (
        <>
          <AlertCircle
            className="ll:size-3.5 ll:text-red-300"
            aria-hidden="true"
          />
          <span className="ll:text-red-200">{t("saveStatus.error")}</span>
          <button
            type="button"
            onClick={() => void settingsPatchQueue.retry()}
            className="ll-custom-cursor-pointer ll:rounded-sm ll:border-0 ll:bg-white/10 ll:px-1.5 ll:py-0.5 ll:text-[11px] ll:font-semibold ll:leading-none ll:text-gray-100 ll:hover:bg-white/20 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
          >
            {t("saveStatus.retry")}
          </button>
        </>
      ) : status === "saving" ? (
        <>
          <Loader2
            className="ll:size-3.5 ll:animate-spin ll:text-gray-300"
            aria-hidden="true"
          />
          <span className="ll:text-gray-300">{t("saveStatus.saving")}</span>
        </>
      ) : (
        <>
          <Check
            className="ll:size-3.5 ll:text-emerald-300"
            aria-hidden="true"
          />
          <span className="ll:text-gray-300">{t("saveStatus.saved")}</span>
        </>
      )}
    </div>
  );
};
