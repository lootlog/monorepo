import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { Outlet, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const EventEditPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  const basePath = `/${guildId ?? ""}`;
  const eventIdPath = eventId ?? "";

  const navItems = [
    {
      id: "settings",
      label: t("events.editSections.settings"),
      href: `/events/${eventIdPath}/edit/settings`,
    },
    {
      id: "rulebook",
      label: t("events.editSections.rulebook"),
      href: `/events/${eventIdPath}/edit/rulebook`,
    },
    {
      id: "scoring",
      label: t("events.editSections.scoring"),
      href: `/events/${eventIdPath}/edit/scoring`,
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <PageTabsLayout
        tabs={navItems}
        basePath={basePath}
        ariaLabel={t("events.editSections.ariaLabel")}
      >
        <Outlet />
      </PageTabsLayout>
    </div>
  );
};
