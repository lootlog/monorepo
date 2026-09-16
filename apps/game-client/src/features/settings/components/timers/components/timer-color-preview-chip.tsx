import { useTimersStore } from "@/store/timers.store";
import {
  getTimerColor,
  resolveTimerColorPaint,
} from "@/features/timers/constants/timer-colors";
import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimerColorPreviewChipProps = {
  /** Stripe colour on the tile's left edge. */
  borderColor: string;
  defaultColorId?: string;
  /** Background colour including its alpha channel. */
  backgroundColor: string;
  fontSize?: number;
  className?: string;
};

/**
 * Renders a sample timer tile painted with the given colours, the way the
 * timers window shows one.
 */
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
