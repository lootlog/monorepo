import { GeneralForm } from "@/features/guild/settings/general/general-form";
import { Settings } from "lucide-react";
import { SettingsHeader } from "../settings-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";

export const GeneralSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <SettingsHeader
        icon={Settings}
        title={t("settings.general.title")}
        description={t("settings.general.description")}
        className="mx-3 mt-3"
      />
      <ScrollArea className="flex-1 min-h-0 bg-background">
        {guild && <GeneralForm />}
      </ScrollArea>
    </div>
  );
};
