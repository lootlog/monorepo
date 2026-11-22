import { InfoButton } from "@/components/common/info-button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationsInfoDialog } from "./notifications-info-dialog";

export const NotificationsInfoButton = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <InfoButton
        label={t("settings.notifications.info.title")}
        onClick={() => setIsOpen(true)}
      />
      <NotificationsInfoDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
