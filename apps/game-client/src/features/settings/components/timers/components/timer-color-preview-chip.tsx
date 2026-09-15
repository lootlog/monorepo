import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimerColorPreviewChipProps = {
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
  backgroundColor,
  fontSize = 10,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <span aria-hidden className={cn("ll:flex ll:w-32", className)}>
      <TimerTileView
        customBackgroundColor={backgroundColor}
        displayMode="row"
        fontSize={fontSize}
        label={t("common:preview.name")}
        timeLabel={t("common:preview.time")}
      />
    </span>
  );
};
