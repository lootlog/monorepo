import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { Clock3 } from "lucide-react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import {
  getJobErrorMessage,
  getJobKindLabel,
  getJobStatusBadgeProps,
  getJobStatusLabel,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { NotificationJobDetailRow } from "./notification-job-detail-row";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

type NotificationJobDetailDialogProps = {
  job: NotificationJobsResponseDto["pending"][number] | null;
  onOpenChange: (open: boolean) => void;
};

const getNotificationJobPayload = (
  job: NonNullable<NotificationJobDetailDialogProps["job"]>,
) => {
  const payload = job.payloadSnapshot;

  return {
    message: payload?.message ?? payload?.content ?? undefined,
    npcName: payload?.npcName ?? undefined,
    title: payload?.title ?? undefined,
    world: payload?.world ?? job.rule.world,
  };
};

const hasJobDeliveryDetails = (
  job: NonNullable<NotificationJobDetailDialogProps["job"]>,
) =>
  job.attemptCount > 0 ||
  Boolean(job.providerMessageId) ||
  Boolean(job.sourceEntityType);

export const NotificationJobDetailDialog = ({
  job,
  onOpenChange,
}: NotificationJobDetailDialogProps) => {
  const { t } = useTranslation();

  if (!job) {
    return null;
  }

  const { message, npcName, title, world } = getNotificationJobPayload(job);
  const hasDeliveryDetails = hasJobDeliveryDetails(job);

  return (
    <Dialog open={job !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-xl">
        <IconDialogHeader
          icon={Clock3}
          title={t("settings.notifications.jobDetail.title")}
        />
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="flex flex-col gap-5 px-5 py-5">
            <section>
              <SectionCardHeader
                title={t("settings.notifications.jobDetail.sectionOverview")}
                className="px-0"
              />
              <div className="mt-2 flex flex-col gap-3 py-3">
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.rule")}
                  value={
                    job.rule.name ??
                    t(
                      getNotificationTriggerTranslationKey(
                        job.rule.triggerType,
                      ),
                    )
                  }
                />
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.trigger")}
                  value={t(
                    getNotificationTriggerTranslationKey(job.rule.triggerType),
                  )}
                />
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.target")}
                  value={getGuildNotificationTargetLabel(job.target)}
                />
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.status")}
                  value={
                    <Badge {...getJobStatusBadgeProps(job.status)}>
                      {getJobStatusLabel(job.status, t)}
                    </Badge>
                  }
                />
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.kind")}
                  value={
                    <Badge variant="outline">
                      {getJobKindLabel(job.jobKind, t)}
                    </Badge>
                  }
                />
                {world ? (
                  <NotificationJobDetailRow
                    label={t("settings.notifications.jobDetail.world")}
                    value={world}
                  />
                ) : null}
                {npcName ? (
                  <NotificationJobDetailRow
                    label={t("settings.notifications.jobDetail.npcName")}
                    value={npcName}
                  />
                ) : null}
                <Separator />
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.scheduledFor")}
                  value={timestampToDate(
                    job.scheduledFor,
                    DATE_TIME_WITH_SECONDS_FORMAT,
                  )}
                />
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.createdAt")}
                  value={timestampToDate(
                    job.createdAt,
                    DATE_TIME_WITH_SECONDS_FORMAT,
                  )}
                />
                {job.processedAt ? (
                  <NotificationJobDetailRow
                    label={t("settings.notifications.jobDetail.processedAt")}
                    value={timestampToDate(
                      job.processedAt,
                      DATE_TIME_WITH_SECONDS_FORMAT,
                    )}
                  />
                ) : null}
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.updatedAt")}
                  value={timestampToDate(
                    job.updatedAt,
                    DATE_TIME_WITH_SECONDS_FORMAT,
                  )}
                />
              </div>
            </section>

            {message ? (
              <section>
                <SectionCardHeader
                  title={t("settings.notifications.jobDetail.sectionContent")}
                  className="px-0"
                />
                <div className="mt-2 py-3">
                  {title ? (
                    <p className="mb-2 text-sm font-semibold">{title}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {message}
                  </p>
                </div>
              </section>
            ) : null}

            {hasDeliveryDetails ? (
              <section>
                <SectionCardHeader
                  title={t("settings.notifications.jobDetail.sectionDelivery")}
                  className="px-0"
                />
                <div className="mt-2 flex flex-col gap-3 py-3">
                  {job.attemptCount > 0 ? (
                    <NotificationJobDetailRow
                      label={t("settings.notifications.jobDetail.attemptCount")}
                      value={job.attemptCount}
                    />
                  ) : null}
                  {job.providerMessageId ? (
                    <NotificationJobDetailRow
                      label={t(
                        "settings.notifications.jobDetail.providerMessageId",
                      )}
                      value={
                        <span className="max-w-48 truncate font-mono text-xs">
                          {job.providerMessageId}
                        </span>
                      }
                    />
                  ) : null}
                  {job.sourceEntityType ? (
                    <NotificationJobDetailRow
                      label={t("settings.notifications.jobDetail.sourceEntity")}
                      value={job.sourceEntityType}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}

            {job.blockedReason ? (
              <Alert variant="timer">
                <AlertTitle>
                  {t("settings.notifications.jobDetail.blockedReason")}
                </AlertTitle>
                <AlertDescription>
                  {getJobErrorMessage(job.blockedReason, t)}
                </AlertDescription>
              </Alert>
            ) : null}
            {job.lastError ? (
              <Alert variant="alert">
                <AlertTitle>
                  {t("settings.notifications.jobDetail.lastError")}
                </AlertTitle>
                <AlertDescription>
                  {getJobErrorMessage(job.lastError, t)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
