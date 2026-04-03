import { useState } from "react";
import { BellRing, Info, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { PageHeader } from "@/components/common/page-header";
import { NotificationsActionsCard } from "./components/notifications-actions-card";
import { NotificationsPendingJobsCard } from "./components/notifications-jobs-card";
import { NotificationsRecentHistoryCard } from "./components/notifications-recent-history-card";
import { NotificationsRulesCard } from "./components/notifications-rules-card";
import { NotificationsTargetsCard } from "./components/notifications-targets-card";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { NotificationsInfoDialog } from "./components/notifications-info-dialog";
import { hasConfirmedGuildDiscordPermissions } from "@/features/guild-settings/utils/has-confirmed-guild-discord-permissions";
import { useGuildDiscordSync } from "@/hooks/api/guilds/use-guild-discord-sync";
import {
  useGuildNotifications,
  useGuildNotificationJobs,
  type GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import { isSupportedGuildNotificationTrigger } from "./utils/notification-settings.utils";

export const NotificationsSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: syncState } = useGuildDiscordSync();
  const { data, isLoading } = useGuildNotifications();
  const { data: jobsData } = useGuildNotificationJobs({
    pollPendingJobs: true,
  });
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] =
    useState(false);
  const [editedTarget, setEditedTarget] = useState<
    GuildNotificationTarget | undefined
  >();
  const missingPermissions = syncState?.missingPermissions ?? [];
  const hasRequiredPermissions = hasConfirmedGuildDiscordPermissions(syncState);
  const installUrl = guildId ? buildDiscordBotInstallUrl(guildId) : "#";
  const targets = data?.targets ?? [];
  const notificationLimits = data?.limits;
  const visibleRules =
    data?.rules.filter((rule) =>
      isSupportedGuildNotificationTrigger(rule.triggerType),
    ) ?? [];
  const isRuleLimitReached =
    notificationLimits !== undefined &&
    notificationLimits.ruleCount >= notificationLimits.ruleLimit;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-background/50">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-3 py-3">
            <PageHeader
              icon={BellRing}
              title={t("settings.notifications.title")}
              description={t("settings.notifications.description")}
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
                    {t("settings.notifications.info.title")}
                  </TooltipContent>
                </Tooltip>
              }
            />

            {!hasRequiredPermissions ? (
              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500/10 p-2.5 shadow-inner shadow-amber-500/10">
                    <ShieldAlert className="size-4 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-tight">
                      {t("settings.notifications.permissionsBlocked.title")}
                    </h3>
                    <p className="mt-1 text-xs leading-tight text-muted-foreground">
                      {t(
                        "settings.notifications.permissionsBlocked.description",
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {missingPermissions.map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => window.location.assign(installUrl)}
                    >
                      {t("settings.notifications.permissionsBlocked.reinstall")}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <>
                <div className="lg:hidden">
                  <NotificationsActionsCard
                    hasRequiredPermissions={hasRequiredPermissions}
                    isRuleLimitReached={isRuleLimitReached}
                    onAddTarget={() => setIsCreateTargetDialogOpen(true)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="space-y-4 lg:col-span-2">
                    <NotificationsTargetsCard
                      targets={targets}
                      rules={visibleRules}
                      actionsDisabled={!hasRequiredPermissions}
                      onEditTarget={setEditedTarget}
                    />
                    <NotificationsRulesCard
                      rules={visibleRules}
                      limits={notificationLimits}
                      actionsDisabled={!hasRequiredPermissions}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="hidden lg:block">
                      <NotificationsActionsCard
                        hasRequiredPermissions={hasRequiredPermissions}
                        isRuleLimitReached={isRuleLimitReached}
                        onAddTarget={() => setIsCreateTargetDialogOpen(true)}
                      />
                    </div>

                    {jobsData ? (
                      <NotificationsPendingJobsCard
                        pendingJobs={jobsData.pending}
                      />
                    ) : null}

                    {jobsData ? (
                      <NotificationsRecentHistoryCard
                        historyJobs={jobsData.history}
                      />
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <NotificationsInfoDialog
        open={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
      />

      <NotificationTargetDialog
        open={isCreateTargetDialogOpen}
        mode="create"
        existingTargets={targets}
        onOpenChange={setIsCreateTargetDialogOpen}
      />

      <NotificationTargetDialog
        open={editedTarget !== undefined}
        mode="edit"
        target={editedTarget}
        existingTargets={targets}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditedTarget(undefined);
          }
        }}
      />
    </>
  );
};
