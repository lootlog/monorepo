import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type NotificationJobCountdownProps = {
  scheduledFor: string;
};

const getRemainingTimeLabel = (scheduledFor: string) => {
  const remainingSeconds = Math.floor(
    (new Date(scheduledFor).getTime() - Date.now()) / 1000,
  );

  if (remainingSeconds <= 0) {
    return null;
  }

  if (remainingSeconds < 60 * 60) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  if (remainingSeconds < 60 * 60 * 24) {
    const hours = Math.floor(remainingSeconds / (60 * 60));
    const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60);
    const seconds = remainingSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  const days = Math.floor(remainingSeconds / (60 * 60 * 24));
  const hours = Math.floor((remainingSeconds % (60 * 60 * 24)) / (60 * 60));

  return `${days}d ${hours}h`;
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

    const interval = window.setInterval(updateRemainingTime, 1000);

    return () => window.clearInterval(interval);
  }, [scheduledFor]);

  return (
    <p className="text-xs font-medium text-primary">
      {remainingTimeLabel
        ? t("settings.notifications.jobs.sendsIn", {
            time: remainingTimeLabel,
          })
        : t("settings.notifications.jobs.sendsNow")}
    </p>
  );
};
