import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { cn } from "cn";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { formatDuration } from "@/utils/date/format-duration";
import { TIMER_PHASE_TEXT_CLASS } from "@/features/guild/timers/timer-phase-text-class";

const URGENT_REMAINING_SECONDS = 10;

type NotificationJobCountdownProps = {
  scheduledFor: string;
};

const getRemainingSeconds = (scheduledFor: string) =>
  Math.floor((new Date(scheduledFor).getTime() - Date.now()) / 1000);

export const NotificationJobCountdown = ({
  scheduledFor,
}: NotificationJobCountdownProps) => {
  const { t } = useTranslation();

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(scheduledFor),
  );

  useEffect(() => {
    const updateRemainingTime = () => {
      setRemainingSeconds(getRemainingSeconds(scheduledFor));
    };

    updateRemainingTime();

    return subscribeToSecondClock(updateRemainingTime);
  }, [scheduledFor]);

  const isDue = remainingSeconds <= 0;
  const dueChange = useChangeCount(isDue);

  const remainingTimeLabel = isDue
    ? null
    : formatDuration(remainingSeconds, "countdown");

  const label = remainingTimeLabel
    ? t("settings.notifications.jobs.sendsIn", { time: remainingTimeLabel })
    : t("settings.notifications.jobs.sendsNow");

  return (
    <span
      title={label}
      className={cn(
        "shrink-0 text-[15px] leading-5 font-semibold tabular-nums transition-colors duration-500 motion-reduce:transition-none",
        remainingSeconds <= URGENT_REMAINING_SECONDS
          ? TIMER_PHASE_TEXT_CLASS.window
          : "text-primary",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          isDue &&
            dueChange > 0 &&
            "inline-block animate-pop-in motion-reduce:animate-none",
        )}
      >
        {remainingTimeLabel ?? t("settings.notifications.jobs.now")}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
};
