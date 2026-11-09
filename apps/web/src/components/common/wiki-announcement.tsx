import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { AnnouncementBar } from "@/components/common/announcement-bar";
import { WIKI_URL } from "@/config/wiki";

/** The bar that introduces the wiki until the player opens or hides it. */
export const WikiAnnouncement = () => {
  const { t } = useTranslation();

  return (
    <AnnouncementBar
      dismissedStorageKey="lootlog:announcement:wiki-launch:dismissed"
      icon={<BookOpen className="size-4" />}
      title={t("layout.wikiAnnouncement.title")}
      description={t("layout.wikiAnnouncement.description")}
      actionLabel={t("layout.wikiAnnouncement.open")}
      href={WIKI_URL}
      dismissLabel={t("layout.wikiAnnouncement.dismiss")}
    />
  );
};
