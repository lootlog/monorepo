import { HorizontalMenu } from "@/components/layout/horizontal-menu";
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
      label: t("events.editSections.settings", "Ustawienia eventu"),
      href: `/events/${eventIdPath}/edit/settings`,
    },
    {
      id: "rulebook",
      label: t("events.editSections.rulebook", "Regulamin"),
      href: `/events/${eventIdPath}/edit/rulebook`,
    },
    {
      id: "scoring",
      label: t("events.editSections.scoring", "Ustawienia punktów"),
      href: `/events/${eventIdPath}/edit/scoring`,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-background">
      <HorizontalMenu
        items={navItems}
        basePath={basePath}
        ariaLabel={t("events.editSections.ariaLabel", "Edycja eventu")}
        className="shrink-0"
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
