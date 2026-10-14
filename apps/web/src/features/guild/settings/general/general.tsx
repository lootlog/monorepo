import { GeneralForm } from "@/features/guild/settings/general/general-form";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { SettingsTabPage } from "@/components/common/settings-tab-page";

export const GeneralSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  return (
    <SettingsTabPage title={t("settings.general.title")}>
      {guild && <GeneralForm />}
    </SettingsTabPage>
  );
};
