import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { NotificationSettingsSkeleton } from "./notification-settings-skeleton";
import { useState } from "react";
import { Info, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Link } from "@tanstack/react-router";
import { ListToolbar } from "@/components/common/list-toolbar";
import { ROUTES } from "@/config/routes";
import { NotificationsPendingJobsSection } from "./components/notifications-pending-jobs-section";
import { NotificationsRecentHistorySection } from "./components/notifications-recent-history-section";
import { NotificationsRulesSection } from "./components/notifications-rules-section";
import { NotificationsTargetsSection } from "./components/notifications-targets-section";
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
import {
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
  isSupportedGuildNotificationTrigger,
} from "./utils/notification-settings.utils";
import {
  NOTIFICATIONS_COLUMNS_CLASS,
  NOTIFICATIONS_MAIN_CLASS,
  NOTIFICATIONS_RAIL_CLASS,
} from "./notifications-layout";

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
  const [search, setSearch] = useState("");

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

  const normalizedSearch = search.trim().toLocaleLowerCase("pl");
  const isFiltered = normalizedSearch.length > 0;

  const matchesSearch = (name: string) =>
    name.toLocaleLowerCase("pl").includes(normalizedSearch);

  const filteredRules = visibleRules.filter((rule) =>
    matchesSearch(
      rule.name ?? t(getNotificationTriggerTranslationKey(rule.triggerType)),
    ),
  );

  const filteredTargets = targets.filter((target) =>
    matchesSearch(getGuildNotificationTargetLabel(target)),
  );

  const canAddRule = hasRequiredPermissions && !isRuleLimitReached;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <h1 className="sr-only">{t("settings.notifications.title")}</h1>
        <ScrollArea data-under-top-bar className="min-h-0 flex-1">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder={t("settings.notifications.filterPlaceholder")}
            label={t("settings.notifications.filterLabel")}
            clearLabel={t("settings.notifications.clearFilter")}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasRequiredPermissions}
                icon=<Plus className="size-4" />
                onClick={() => setIsCreateTargetDialogOpen(true)}
              >
                {t("settings.notifications.actions.addTargetShort")}
              </Button>
              {canAddRule ? (
                <Button
                  size="sm"
                  icon=<Plus className="size-4" />
                  render={
                    <Link to={ROUTES.guild.notifications.create(guildId ?? "")}>
                      {t("settings.notifications.actions.addRule")}
                    </Link>
                  }
                  nativeButton={false}
                />
              ) : (
                <Button size="sm" disabled icon=<Plus className="size-4" />>
                  {t("settings.notifications.actions.addRule")}
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      aria-label={t("settings.notifications.info.title")}
                      onClick={() => setIsInfoDialogOpen(true)}
                    >
                      <Info className="size-4" aria-hidden="true" />
                    </Button>
                  }
                />
                <TooltipContent>
                  {t("settings.notifications.info.title")}
                </TooltipContent>
              </Tooltip>
            </div>
          </ListToolbar>

          {sync.permissionStatus !== "ok" && (
            <div className="p-3">
              <GuildDiscordSyncNotice sync={sync} />
            </div>
          )}

          {isLoading ? (
            <NotificationSettingsSkeleton />
          ) : (
            <div className={NOTIFICATIONS_COLUMNS_CLASS}>
              <div className={NOTIFICATIONS_MAIN_CLASS}>
                <NotificationsRulesSection
                  rules={filteredRules}
                  limits={notificationLimits}
                  actionsDisabled={!hasRequiredPermissions}
                  isFiltered={isFiltered}
                />
                <NotificationsTargetsSection
                  targets={filteredTargets}
                  rules={visibleRules}
                  actionsDisabled={!hasRequiredPermissions}
                  isFiltered={isFiltered}
                  onEditTarget={setEditedTarget}
                />
              </div>

              <div className={NOTIFICATIONS_RAIL_CLASS}>
                {jobsData && (
                  <NotificationsPendingJobsSection
                    pendingJobs={jobsData.pending}
                  />
                )}
                {jobsData && (
                  <NotificationsRecentHistorySection
                    historyJobs={jobsData.history}
                  />
                )}
              </div>
            </div>
          )}
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
