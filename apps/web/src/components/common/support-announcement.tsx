import { useTranslation } from "react-i18next";
import { Coffee } from "lucide-react";
import { AnnouncementBar } from "@/components/common/announcement-bar";
import { SUPPORT_URL } from "@/config/support";

/** The bar that asks players to support Lootlog until they donate or hide it. */
export const SupportAnnouncement = () => {
  const { t } = useTranslation();

  return (
    <AnnouncementBar
      dismissedStorageKey="lootlog:announcement:support:dismissed"
      icon={<Coffee className="size-4" />}
      title={t("layout.supportAnnouncement.title")}
      description={t("layout.supportAnnouncement.description")}
      actionLabel={t("layout.supportAnnouncement.open")}
      href={SUPPORT_URL}
      dismissLabel={t("layout.supportAnnouncement.dismiss")}
    />
  );
};
