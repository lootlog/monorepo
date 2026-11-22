import { useState } from "react";
import { useTranslation } from "react-i18next";

type CooldownAnnouncementProps = {
  countdown: { isExpired: boolean; label: string };
};

export const CooldownAnnouncement = ({
  countdown,
}: CooldownAnnouncementProps) => {
  const { t } = useTranslation();
  const isCoolingDown = !countdown.isExpired;
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
