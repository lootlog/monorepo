import { useTimersStore } from "@/store/timers.store";
import { useTranslation } from "react-i18next";
import { TimerTileView } from "@/features/timers/components/timer-tile-view";

const TIMER_PREVIEW_CONTENT_MIN_HEIGHT_PX = 126;

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
        className="ll:grid ll:content-start ll:gap-1.5"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${Math.min(
            displayConfig.minColumnWidth,
            190,
          )}px, 1fr))`,
          minHeight: TIMER_PREVIEW_CONTENT_MIN_HEIGHT_PX,
        }}
      >
        <TimerTileView
          color="violet"
          displayMode={displayConfig.singleTimerDisplayMode}
          fontSize={displayConfig.fontSize}
          label={`${displayConfig.showType ? "[H]" : ""} ${t(
            "settings.timers.preview.npc",
          )}${displayConfig.showLevel ? " (120m)" : ""}`}
          timeLabel="04:32"
        />
        <TimerTileView
          color="orange"
          displayMode={displayConfig.singleTimerDisplayMode}
          fontSize={displayConfig.fontSize}
          isMinSpawnTime
          label={`${displayConfig.showType ? "[E2]" : ""} Mamlambo${
            displayConfig.showLevel ? " (83h)" : ""
          }`}
          timeLabel="00:41"
        />
        <TimerTileView
          color="blue"
          displayMode={displayConfig.singleTimerDisplayMode}
          fontSize={displayConfig.fontSize}
          hasPassedRedThreshold
          label={`${displayConfig.showType ? "[T]" : ""} Tanroth${
            displayConfig.showLevel ? " (300w)" : ""
          }`}
          timeLabel="-00:12"
        />
      </div>
    </div>
  );
};
