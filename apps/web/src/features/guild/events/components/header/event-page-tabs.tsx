import { PageTabs } from "@/components/layout/page-tabs";
import { useTranslation } from "react-i18next";

export type EventTab = "overview" | "ranking" | "kills" | "coordination";

type EventPageTabsProps = {
  guildId: string;
  eventId: string;
  activeId: EventTab;
};

/** The event's sections, pinned under the app bar. */
export const EventPageTabs = ({
  guildId,
  eventId,
  activeId,
}: EventPageTabsProps) => {
  const { t } = useTranslation();

  return (
    <PageTabs
      ariaLabel={t("events.tabs.label")}
      basePath={`/${guildId}/events/${eventId}`}
      activeId={activeId}
      tabs={[
        { id: "overview", label: t("events.tabs.overview"), href: "" },
        { id: "ranking", label: t("events.tabs.ranking"), href: "/ranking" },
        { id: "kills", label: t("events.tabs.kills"), href: "/kills" },
        {
          id: "coordination",
          label: t("events.tabs.coordination"),
          href: "/coordination",
        },
      ]}
    />
  );
};
