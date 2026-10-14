import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useTranslation } from "react-i18next";

/** Rules, channels and history: the notification views, one page each. */
export const NotificationsTabs = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";

  return (
    <HorizontalMenu
      ariaLabel={t("settings.notifications.tabs.label")}
      items={[
        {
          id: "rules",
          label: t("settings.notifications.tabs.rules"),
          href: ROUTES.guild.notifications.base(guildId),
        },
        {
          id: "channels",
          label: t("settings.notifications.tabs.channels"),
          href: ROUTES.guild.notifications.channels(guildId),
        },
        {
          id: "history",
          label: t("settings.notifications.tabs.history"),
          href: ROUTES.guild.notifications.history(guildId),
        },
      ]}
    />
  );
};
