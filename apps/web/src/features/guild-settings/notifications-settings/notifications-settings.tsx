import { useState } from "react";
import { BellRing, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { NotificationRuleCard } from "./components/notification-rule-card";
import { NotificationRuleDialog } from "./components/notification-rule-dialog";
import { NotificationTargetCard } from "./components/notification-target-card";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { NotificationsJobsCard } from "./components/notifications-jobs-card";
import { hasConfirmedGuildDiscordPermissions } from "@/features/guild-settings/utils/has-confirmed-guild-discord-permissions";
import { useGuildDiscordSync } from "@/hooks/api/guilds/use-guild-discord-sync";
import {
  useGuildNotifications,
  type GuildNotificationRule,
  type GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import {
  getGuildNotificationTargetUsageCount,
  isSupportedGuildNotificationTrigger,
} from "./utils/notification-settings.utils";

export const NotificationsSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: syncState } = useGuildDiscordSync();
  const { data, isLoading } = useGuildNotifications();
  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] =
    useState(false);
  const [editedTarget, setEditedTarget] = useState<
    GuildNotificationTarget | undefined
  >();
  const [isCreateRuleDialogOpen, setIsCreateRuleDialogOpen] = useState(false);
  const [editedRule, setEditedRule] = useState<
    GuildNotificationRule | undefined
  >();

  const missingPermissions = syncState?.missingPermissions ?? [];
  const hasRequiredPermissions = hasConfirmedGuildDiscordPermissions(syncState);
  const installUrl = guildId ? buildDiscordBotInstallUrl(guildId) : "#";
  const targets = data?.targets ?? [];
  const visibleRules =
    data?.rules.filter((rule) =>
      isSupportedGuildNotificationTrigger(rule.triggerType),
    ) ?? [];

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-background/50">
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-4 px-3 py-3">
            <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-xl bg-blue-500/10 p-2.5 shadow-inner shadow-blue-500/10">
                    <BellRing className="size-4 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold leading-tight">
                      {t("settings.notifications.title")}
                    </h2>
                    <p className="text-xs leading-tight text-muted-foreground">
                      {t("settings.notifications.description")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    disabled={!hasRequiredPermissions}
                    onClick={() => setIsCreateTargetDialogOpen(true)}
                  >
                    {t("settings.notifications.actions.addTarget")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!hasRequiredPermissions}
                    onClick={() => setIsCreateRuleDialogOpen(true)}
                  >
                    {t("settings.notifications.actions.addRule")}
                  </Button>
                </div>
              </div>
            </Card>

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
                        <Badge key={permission} variant="outline">
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
                <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">
                        {t("settings.notifications.sections.targets")}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "settings.notifications.sections.targetsDescription",
                        )}
                      </p>
                    </div>
                    <Badge variant="outline">{targets.length}</Badge>
                  </div>
                  {targets.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {targets.map((target) => (
                        <NotificationTargetCard
                          key={target.id}
                          target={target}
                          usageCount={getGuildNotificationTargetUsageCount(
                            target.id,
                            visibleRules,
                          )}
                          actionsDisabled={!hasRequiredPermissions}
                          onEdit={setEditedTarget}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
                      {t("settings.notifications.empty.targets")}
                    </div>
                  )}
                </Card>

                <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">
                        {t("settings.notifications.sections.rules")}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {t("settings.notifications.sections.rulesDescription")}
                      </p>
                    </div>
                    <Badge variant="outline">{visibleRules.length}</Badge>
                  </div>
                  {visibleRules.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {visibleRules.map((rule) => (
                        <NotificationRuleCard
                          key={rule.id}
                          rule={rule}
                          actionsDisabled={!hasRequiredPermissions}
                          onEdit={setEditedRule}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
                      {t("settings.notifications.empty.rules")}
                    </div>
                  )}
                </Card>

                {data ? <NotificationsJobsCard jobs={data.jobs} /> : null}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

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

      <NotificationRuleDialog
        open={isCreateRuleDialogOpen}
        targets={targets}
        onOpenChange={setIsCreateRuleDialogOpen}
      />

      <NotificationRuleDialog
        open={editedRule !== undefined}
        rule={editedRule}
        targets={targets}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditedRule(undefined);
          }
        }}
      />
    </>
  );
};
