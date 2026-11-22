import { useTimersStore } from "@/store/timers.store";
import {
  getTimerColor,
  resolveTimerColorPaint,
} from "@lootlog/domain/timer-colors";
import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimerColorPreviewChipProps = {
  borderColor: string;
  defaultColorId?: string;
  backgroundColor: string;
  fontSize?: number;
  className?: string;
};

export const TimerColorPreviewChip: FC<TimerColorPreviewChipProps> = ({
  defaultColorId,
  borderColor,
  backgroundColor,
  fontSize = 10,
  className,
}) => {
  const { t } = useTranslation();

  const legacyAppearance = useTimersStore(
    (state) => state.displayConfig.legacyAppearance,
  );

  const builtin = defaultColorId
    ? getTimerColor(defaultColorId, legacyAppearance)
    : undefined;

  const paint =
    builtin &&
    builtin.accent.toLowerCase() === borderColor.toLowerCase() &&
    builtin.fill.toLowerCase() === backgroundColor.toLowerCase()
      ? builtin
      : resolveTimerColorPaint(
          "",
          { borderColor, backgroundColor },
          undefined,
          legacyAppearance,
        );

  return (
    <span aria-hidden className={cn("ll:flex ll:w-32", className)}>
      <TimerTileView
        legacyAppearance={legacyAppearance}
        paint={paint}
        displayMode="row"
        fontSize={fontSize}
        label={t("common:preview.name")}
        timeLabel={t("common:preview.time")}
      />
    </span>
  );
};
