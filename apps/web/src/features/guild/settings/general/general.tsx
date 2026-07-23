import { GeneralForm } from "@/features/guild/settings/general/general-form";
import { Settings } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/api-client/react-query/main/guilds";
import { useTranslation } from "react-i18next";

const GeneralHeader = () => {
  const { t } = useTranslation();

  return (
    <Card className="mx-3 mt-3 gap-4 border-border bg-card/60 p-4 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10 shadow-inner shadow-primary/10">
          <Settings className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {t("settings.general.title")}
          </h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("settings.general.description")}
          </p>
        </div>
      </div>
    </Card>
  );
};

export const GeneralSettings = () => {
  const guildId = useGuildId();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <GeneralHeader />
      <ScrollArea className="flex-1 min-h-0 bg-background/50">
        {guild && <GeneralForm />}
      </ScrollArea>
    </div>
  );
};
