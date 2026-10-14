import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { ROUTES } from "@/config/routes";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { canManageGuild } from "@/lib/guild-permissions";
import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

/**
 * The Organization's settings, one tab each; a role, monster or member page
 * shows a back arrow instead of the tabs.
 */
export const SettingsLayout = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const { data: accessPolicy } = useGuildPermissions();
  const routes = ROUTES.guild.settings;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageTabsLayout
        ariaLabel={t("settings.navigationLabel")}
        tabs={[
          {
            id: "general",
            label: t("settings.guildNavigation.general"),
            href: routes.base(guildId),
          },
          {
            id: "roles",
            label: t("settings.guildNavigation.roles"),
            href: routes.roles(guildId),
          },
          {
            id: "npcs",
            label: t("settings.guildNavigation.npcs"),
            href: routes.npcs(guildId),
          },
          {
            id: "map-templates",
            label: t("settings.guildNavigation.mapTemplates"),
            href: routes.mapTemplates(guildId),
          },
          ...(canManageGuild(accessPolicy)
            ? [
                {
                  id: "reservations",
                  label: t("settings.guildNavigation.reservations"),
                  href: routes.reservationsSettings(guildId),
                },
              ]
            : []),
          {
            id: "members",
            label: t("settings.guildNavigation.members"),
            href: routes.members(guildId),
          },
          {
            id: "info",
            label: t("settings.guildNavigation.info"),
            href: routes.info(guildId),
          },
        ]}
      >
        <Outlet />
      </PageTabsLayout>
    </div>
  );
};
