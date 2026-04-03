import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { Clock3 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { toast } from "sonner";
import {
  useCancelGuildNotificationJob,
  type GuildNotificationsResponse,
} from "@/hooks/api/guilds/use-guild-notifications";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import {
  getGuildNotificationTargetLabel,
  getJobKindLabel,
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { NotificationJobCountdown } from "./notification-job-countdown";

type NotificationsPendingJobsCardProps = {
  pendingJobs: GuildNotificationsResponse["jobs"]["pending"];
};

export const NotificationsPendingJobsCard = ({
  pendingJobs,
}: NotificationsPendingJobsCardProps) => {
  const { t } = useTranslation();
  const cancelGuildJob = useCancelGuildNotificationJob();

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelGuildJob.mutateAsync({ jobId });
      toast.success(t("settings.notifications.toasts.jobCanceled"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.jobCancelError"),
      );
    }
  };

  return (
    <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
          <Clock3 className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">
            {t("settings.notifications.jobs.pending")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.notifications.sections.jobsDescription")}
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {pendingJobs.length}
        </Badge>
      </div>

      {pendingJobs.length > 0 ? (
        <ScrollArea className="max-h-[52rem]">
          <div className="flex flex-col gap-3">
            {pendingJobs.map((job) => (
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
                      {getJobStatusLabel(job.status, t)}
                    </Badge>
                    <Badge variant="outline">
                      {getJobKindLabel(job.jobKind, t)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.jobs.targetLabel", {
                      target: getGuildNotificationTargetLabel(job.target),
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.jobs.scheduledFor", {
                      date: format(
                        new Date(job.scheduledFor),
                        "dd.MM.yyyy HH:mm:ss",
                      ),
                    })}
                  </p>
                  <NotificationJobCountdown scheduledFor={job.scheduledFor} />
                  {job.blockedReason ? (
                    <p className="text-xs text-amber-500">
                      {job.blockedReason}
                    </p>
                  ) : null}
                  <div className="pt-1">
                    <ConfirmDeleteDialog
                      disabled={cancelGuildJob.isPending}
                      onConfirm={() => handleCancelJob(job.id)}
                      title={t("settings.notifications.cancelJobDialog.title")}
                      description={t(
                        "settings.notifications.cancelJobDialog.description",
                        {
                          name:
                            job.rule.name ??
                            t(
                              getNotificationTriggerTranslationKey(
                                job.rule.triggerType,
                              ),
                            ),
                        },
                      )}
                      confirmButtonLabel={t(
                        "settings.notifications.actions.cancelPending",
                      )}
                      cancelButtonLabel={t(
                        "settings.notifications.actions.cancel",
                      )}
                      trigger={
                        <Button type="button" size="sm" variant="outline">
                          {t("settings.notifications.actions.cancelPending")}
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
          {t("settings.notifications.empty.pendingJobs")}
        </div>
      )}
    </Card>
  );
};
