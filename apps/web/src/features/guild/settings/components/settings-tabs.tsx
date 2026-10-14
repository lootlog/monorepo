import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTES } from "@/config/routes";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { canManageGuild } from "@/lib/guild-permissions";
import { useTranslation } from "react-i18next";

/** The Organization's settings, one page each. */
export const SettingsTabs = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const { data: accessPolicy } = useGuildPermissions();
  const routes = ROUTES.guild.settings;

  return (
    <HorizontalMenu
      ariaLabel={t("settings.navigationLabel")}
      items={[
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
    />
  );
};
