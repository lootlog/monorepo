import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";
import { formatDuration } from "@/utils/date/format-duration";

type NotificationJobCountdownProps = {
  scheduledFor: string;
};

const getRemainingTimeLabel = (scheduledFor: string) => {
  const remainingSeconds = Math.floor(
    (new Date(scheduledFor).getTime() - Date.now()) / 1000,
  );

  return remainingSeconds > 0
    ? formatDuration(remainingSeconds, "countdown")
    : null;
};

export const NotificationJobCountdown = ({
  scheduledFor,
}: NotificationJobCountdownProps) => {
  const { t } = useTranslation();

  const [remainingTimeLabel, setRemainingTimeLabel] = useState(() =>
    getRemainingTimeLabel(scheduledFor),
  );

  useEffect(() => {
    const updateRemainingTime = () => {
      setRemainingTimeLabel(getRemainingTimeLabel(scheduledFor));
    };

    updateRemainingTime();

    return subscribeToSecondClock(updateRemainingTime);
  }, [scheduledFor]);

  const label = remainingTimeLabel
    ? t("settings.notifications.jobs.sendsIn", { time: remainingTimeLabel })
    : t("settings.notifications.jobs.sendsNow");

  return (
    <span
      title={label}
      className="shrink-0 text-[15px] leading-5 font-semibold tabular-nums text-primary"
    >
      <span aria-hidden="true">
        {remainingTimeLabel ?? t("settings.notifications.jobs.now")}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
};
