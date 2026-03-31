import { Clock3 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import type { GuildNotificationsResponse } from "@/hooks/api/guilds/use-guild-notifications";
import {
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";

type NotificationsJobsCardProps = {
  jobs: GuildNotificationsResponse["jobs"];
};

export const NotificationsJobsCard = ({ jobs }: NotificationsJobsCardProps) => {
  const { t } = useTranslation();

  const jobStatusLabels = {
    PENDING: t("settings.notifications.jobStatuses.pending"),
    PROCESSING: t("settings.notifications.jobStatuses.processing"),
    SENT: t("settings.notifications.jobStatuses.sent"),
    FAILED: t("settings.notifications.jobStatuses.failed"),
    BLOCKED: t("settings.notifications.jobStatuses.blocked"),
    CANCELED: t("settings.notifications.jobStatuses.canceled"),
  } as const;

  return (
    <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
          <Clock3 className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">
            {t("settings.notifications.sections.jobs")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.notifications.sections.jobsDescription")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t("settings.notifications.jobs.pending")}
            </p>
            <Badge variant="outline">{jobs.pending.length}</Badge>
          </div>
          {jobs.pending.length > 0 ? (
            jobs.pending.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-border/70 bg-background/30 p-3"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {job.rule.name ??
                        t(
                          getNotificationTriggerTranslationKey(
                            job.rule.triggerType,
                          ),
                        )}
                    </p>
                    <Badge variant="outline">
                      {
                        jobStatusLabels[
                          job.status as keyof typeof jobStatusLabels
                        ]
                      }
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.jobs.targetLabel", {
                      target: getGuildNotificationTargetLabel(job.target),
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(job.scheduledFor), "dd.MM.yyyy HH:mm:ss")}
                  </p>
                  {job.blockedReason ? (
                    <p className="text-xs text-amber-500">
                      {job.blockedReason}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
              {t("settings.notifications.empty.pendingJobs")}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t("settings.notifications.jobs.history")}
            </p>
            <Badge variant="outline">{jobs.history.length}</Badge>
          </div>
          {jobs.history.length > 0 ? (
            jobs.history.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-border/70 bg-background/30 p-3"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {job.rule.name ??
                        t(
                          getNotificationTriggerTranslationKey(
                            job.rule.triggerType,
                          ),
                        )}
                    </p>
                    <Badge variant="outline">
                      {
                        jobStatusLabels[
                          job.status as keyof typeof jobStatusLabels
                        ]
                      }
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(job.updatedAt), "dd.MM.yyyy HH:mm:ss")}
                  </p>
                  {job.lastError ? (
                    <p className="text-xs text-destructive">{job.lastError}</p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
              {t("settings.notifications.empty.historyJobs")}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
