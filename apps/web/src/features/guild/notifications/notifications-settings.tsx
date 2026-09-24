import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { NotificationSettingsSkeleton } from "./notification-settings-skeleton";
import { useState } from "react";
import { BellRing, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { PageHeader } from "@/components/common/page-header";
import { NotificationsActionsCard } from "./components/notifications-actions-card";
import { NotificationsPendingJobsCard } from "./components/notifications-jobs-card";
import { NotificationsRecentHistoryCard } from "./components/notifications-recent-history-card";
import { NotificationsRulesCard } from "./components/notifications-rules-card";
import { NotificationsTargetsCard } from "./components/notifications-targets-card";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { NotificationsInfoDialog } from "./components/notifications-info-dialog";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  getNotificationsGuildControllerGetGuildRulesQueryKey,
  getNotificationsGuildControllerGetGuildTargetsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
  useNotificationsGuildControllerGetGuildRules,
  useNotificationsGuildControllerGetGuildTargets,
  type NotificationTargetResponseDto,
} from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { isSupportedGuildNotificationTrigger } from "./utils/notification-settings.utils";

const getResolvedGuildId = (guildId: string | undefined) => guildId ?? "";

export const NotificationsSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const hasGuildId = Boolean(guildId);
  const resolvedGuildId = getResolvedGuildId(guildId);

  const sync = useGuildDiscordSync();

  const targetsQuery = useNotificationsGuildControllerGetGuildTargets(
    { guildId: resolvedGuildId },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getNotificationsGuildControllerGetGuildTargetsQueryKey({
          guildId: resolvedGuildId,
        }),
      },
    },
  );

  const rulesQuery = useNotificationsGuildControllerGetGuildRules(
    { guildId: resolvedGuildId },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getNotificationsGuildControllerGetGuildRulesQueryKey({
          guildId: resolvedGuildId,
        }),
      },
    },
  );

  const jobsQuery = useNotificationsGuildControllerGetGuildJobs(
    { guildId: resolvedGuildId },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getNotificationsGuildControllerGetGuildJobsQueryKey({
          guildId: resolvedGuildId,
        }),
        refetchInterval: (query) => {
          const jobs = query.state.data;

          if (!jobs || jobs.pending.length === 0) {
            return false;
          }

          return 5000;
        },
      },
    },
  );

  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] =
    useState(false);

  const [editedTarget, setEditedTarget] = useState<
    NotificationTargetResponseDto | undefined
  >();

  const hasRequiredPermissions = sync.permissionStatus === "ok";
  const targets = targetsQuery.data ?? [];
  const notificationLimits = rulesQuery.data?.limits;

  const visibleRules =
    rulesQuery.data?.items.filter((rule) =>
      isSupportedGuildNotificationTrigger(rule.triggerType),
    ) ?? [];

  const jobsData = jobsQuery.data;
  const isLoading = targetsQuery.isLoading || rulesQuery.isLoading;

  const isRuleLimitReached =
    notificationLimits !== undefined &&
    notificationLimits.ruleCount >= notificationLimits.ruleLimit;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-3 py-3">
            <PageHeader
              icon={BellRing}
              title={t("settings.notifications.title")}
              description={t("settings.notifications.description")}
              actions={
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsInfoDialogOpen(true)}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {t("settings.notifications.info.title")}
                  </TooltipContent>
                </Tooltip>
              }
            />

            <GuildDiscordSyncNotice sync={sync} />

            {isLoading ? (
              <NotificationSettingsSkeleton showActions={false} />
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
