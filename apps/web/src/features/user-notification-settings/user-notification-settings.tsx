import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useUser } from "@/hooks/api/user/use-user";
import { TargetsList } from "@/features/guild-settings/notification-settings/components/targets-list";
import { RulesList } from "@/features/guild-settings/notification-settings/components/rules-list";
import { WatchedItemsList } from "./components/watched-items-list";

export const UserNotificationSettings = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  if (!user) return null;

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
                {t("settings.notifications.userDescription")}
              </p>
            </div>
          </div>
        </Card>

        <TargetsList ownerType="user" ownerId={user.id} />
        <RulesList ownerType="user" ownerId={user.id} />
        <WatchedItemsList userId={user.id} />
      </div>
    </ScrollArea>
  );
};
