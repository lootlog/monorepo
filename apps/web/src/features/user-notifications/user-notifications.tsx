import { useState } from "react";
import { BellRing, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
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
        <div className="flex flex-col gap-3 px-3 py-3">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
                <Skeleton className="mb-3 h-5 w-40" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
                <Skeleton className="mb-3 h-5 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-10 rounded-md" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
              </Card>
            </div>
          </div>
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
