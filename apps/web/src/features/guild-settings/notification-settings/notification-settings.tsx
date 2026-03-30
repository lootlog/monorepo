import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { TargetsList } from "./components/targets-list";
import { RulesList } from "./components/rules-list";

export const NotificationSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  if (!guildId) return null;

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="px-3 py-3 flex flex-col gap-4">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
              <Bell className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                {t("settings.notifications.title")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {t("settings.notifications.description")}
              </p>
            </div>
          </div>
        </Card>

        <TargetsList ownerType="guild" ownerId={guildId} />
        <RulesList ownerType="guild" ownerId={guildId} guildId={guildId} />
      </div>
    </ScrollArea>
  );
};
