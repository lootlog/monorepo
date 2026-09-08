import { GeneralForm } from "@/features/guild/settings/general/general-form";
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
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      <h1 className="sr-only">{t("settings.general.title")}</h1>
      <ScrollArea className="flex-1 min-h-48 bg-background">
        {guild && <GeneralForm />}
      </ScrollArea>
    </div>
  );
};
