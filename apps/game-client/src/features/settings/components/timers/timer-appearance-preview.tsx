import { useTimersStore } from "@/store/timers.store";
import { useTranslation } from "react-i18next";

export const TimerAppearancePreview = () => {
  const { t } = useTranslation();
  const displayConfig = useTimersStore((state) => state.displayConfig);

  return (
    <div
      className="ll:rounded-lg ll:border ll:border-purple-400/30 ll:bg-gray-950/85 ll:p-3 ll:shadow-lg"
      aria-label={t("settings.timers.preview.ariaLabel")}
    >
      <div className="ll:mb-2 ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-wider ll:text-purple-300">
        {t("settings.timers.preview.label")}
      </div>
      <div
        className={
          displayConfig.singleTimerDisplayMode === "row"
            ? "ll:flex ll:items-center ll:justify-between ll:rounded-md ll:border ll:border-amber-500/50 ll:bg-amber-950/30 ll:px-2 ll:py-1.5"
            : "ll:flex ll:flex-col ll:items-center ll:rounded-md ll:border ll:border-amber-500/50 ll:bg-amber-950/30 ll:px-2 ll:py-2"
        }
        style={{
          fontSize: displayConfig.fontSize,
          minWidth: Math.min(displayConfig.minColumnWidth, 190),
        }}
      >
        <div className="ll:font-semibold ll:text-amber-100">
          {t("settings.timers.preview.npc")}
          {displayConfig.showLevel ? (
            <span className="ll:ml-1 ll:text-gray-400">120</span>
          ) : null}
          {displayConfig.showType ? (
            <span className="ll:ml-1 ll:text-amber-300">HERO</span>
          ) : null}
        </div>
        <div className="ll:font-mono ll:text-white">04:32</div>
      </div>
    </div>
  );
};
