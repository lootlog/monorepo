import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/** Rules, channels and history: the notification views, one tab each. */
export const NotificationsLayout = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const routes = ROUTES.guild.notifications;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageTabsLayout
        ariaLabel={t("settings.notifications.tabs.label")}
        tabs={[
          {
            id: "rules",
            label: t("settings.notifications.tabs.rules"),
            href: routes.base(guildId),
          },
          {
            id: "channels",
            label: t("settings.notifications.tabs.channels"),
            href: routes.channels(guildId),
          },
          {
            id: "history",
            label: t("settings.notifications.tabs.history"),
            href: routes.history(guildId),
          },
        ]}
      >
        <Outlet />
      </PageTabsLayout>
    </div>
  );
};
