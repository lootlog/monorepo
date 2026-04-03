import { useState } from "react";
import { BellRing, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { PageHeader } from "@/components/common/page-header";
import { DmActionsCard } from "@/features/user-notifications/components/dm-actions-card";
import { UserNotificationsInfoDialog } from "@/features/user-notifications/components/user-notifications-info-dialog";
import { WatchFormDialog } from "@/features/user-notifications/components/watch-item-form-dialog";
import { WatchedItemsList } from "@/features/user-notifications/components/watched-items-list";
import { useGuilds } from "@/hooks/api/guilds/use-guilds";
import { useUserNotifications } from "@/hooks/api/user/use-user-notifications";

export const UserNotifications = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useUserNotifications();
  const { data: guilds = [] } = useGuilds();
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isWatchFormOpen, setIsWatchFormOpen] = useState(false);

  const dmTarget = data?.targets[0] ?? null;
  const hasActiveDm = Boolean(dmTarget?.active && dmTarget.canSend);
  const watchedItems = data?.watchedItems ?? [];
  const guildOptions = guilds.map((guild) => ({
    value: guild.id,
    label: guild.name,
  }));

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background/50">
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-background/50">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-3 py-3">
            <PageHeader
              icon={BellRing}
              title={t("settings.userNotifications.title")}
              description={t("settings.userNotifications.description")}
              actions={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsInfoDialogOpen(true)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("settings.userNotifications.infoDialog.title")}
                  </TooltipContent>
                </Tooltip>
              }
            />

            <div className="lg:hidden">
              <DmActionsCard
                dmTarget={dmTarget}
                onAddWatch={() => setIsWatchFormOpen(true)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <WatchedItemsList watchedItems={watchedItems} guilds={guilds} />
              </div>

              <div className="space-y-4">
                <div className="hidden lg:block">
                  <DmActionsCard
                    dmTarget={dmTarget}
                    onAddWatch={() => setIsWatchFormOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <UserNotificationsInfoDialog
        open={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
      />

      <WatchFormDialog
        open={isWatchFormOpen}
        onOpenChange={setIsWatchFormOpen}
        hasActiveDm={hasActiveDm}
        watchedItems={watchedItems}
        guildOptions={guildOptions}
      />
    </>
  );
};
