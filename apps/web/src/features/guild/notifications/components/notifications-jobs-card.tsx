import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { Clock3 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@lootlog/client/transport";
import {
  getGuildNotificationTargetLabel,
  getJobKindLabel,
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { NotificationJobCountdown } from "./notification-job-countdown";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  prepareGuildNotificationMutation,
  getGuildNotificationMutationCallbacks,
  removeGuildNotificationJobFromCache,
  type GuildNotificationCacheSnapshot,
} from "../notifications-api";
import { useNotificationsGuildControllerCancelGuildJob } from "@lootlog/client/main";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";

type NotificationsPendingJobsCardProps = {
  pendingJobs: NotificationJobsResponseDto["pending"];
};

export const NotificationsPendingJobsCard = ({
  pendingJobs,
}: NotificationsPendingJobsCardProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const cancelGuildJob = useNotificationsGuildControllerCancelGuildJob<
    unknown,
    GuildNotificationCacheSnapshot | undefined
  >({
    mutation: {
      onMutate: async (variables) => {
        if (!guildId) {
          return undefined;
        }

        const previousNotifications = await prepareGuildNotificationMutation(
          queryClient,
          guildId,
        );

        removeGuildNotificationJobFromCache(
          queryClient,
          guildId,
          variables.pathParams.jobId,
        );

        return previousNotifications;
      },
      ...getGuildNotificationMutationCallbacks(queryClient, guildId),
    },
  });

  const handleCancelJob = async (jobId: string) => {
    if (!guildId) {
      const error = new Error("Missing guild id.");
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.jobCancelError"),
      );
      throw error;
    }
    try {
      await cancelGuildJob.mutateAsync({
        pathParams: { guildId, jobId },
      });
      toast.success(t("settings.notifications.toasts.jobCanceled"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.jobCancelError"),
      );
      throw error;
    }
  };

  return (
    <SectionCard>
      <SectionCardHeader
        title={t("settings.notifications.jobs.pending")}
        icon={Clock3}
        description={t("settings.notifications.sections.jobsDescription")}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="ml-auto">
              {pendingJobs.length}
            </Badge>
          </div>
        }
      />
      <SectionCardContent className="flex flex-col gap-3">
        {pendingJobs.length > 0 ? (
          <ScrollArea className="max-h-[52rem]">
            <div className="flex flex-col gap-3">
              {pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="border-b border-border/70 py-3 last:border-b-0"
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
                        title={t(
                          "settings.notifications.cancelJobDialog.title",
                        )}
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
          <div className="py-6 text-sm text-muted-foreground">
            {t("settings.notifications.empty.pendingJobs")}
          </div>
        )}
      </SectionCardContent>
    </SectionCard>
  );
};
