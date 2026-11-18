import { useState } from "react";
import { useTranslation } from "react-i18next";

type CooldownAnnouncementProps = {
  /** The countdown from `useCountdown` that gates a refresh action. */
  countdown: { isExpired: boolean; label: string };
};

/**
 * Announces when a refresh cooldown starts and when it ends. Render it
 * unconditionally beside the control it gates: the live region must stay
 * mounted across both states, and only transitions change its text, so the
 * ticking time is never read out.
 */
export const CooldownAnnouncement = ({
  countdown,
}: CooldownAnnouncementProps) => {
  const { t } = useTranslation();
  const isCoolingDown = !countdown.isExpired;
  // A cooldown already running at mount (e.g. after a reload) is visible but
  // not announced; only transitions are.
  const [wasCoolingDown, setWasCoolingDown] = useState(isCoolingDown);
  const [announcement, setAnnouncement] = useState("");

  if (isCoolingDown !== wasCoolingDown) {
    setWasCoolingDown(isCoolingDown);
    setAnnouncement(
      isCoolingDown
        ? t("common.cooldown.started", { time: countdown.label })
        : t("common.cooldown.ended"),
    );
  }

  return (
    <span aria-live="polite" className="sr-only">
      {announcement}
    </span>
  );
};
