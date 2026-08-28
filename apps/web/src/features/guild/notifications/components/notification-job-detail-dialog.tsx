import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import type { NotificationJobsResponseDto } from "@lootlog/api-client/models/main/notification-jobs-response-dto";
import {
  getJobKindLabel,
  getJobStatusBadgeProps,
  getJobStatusLabel,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { NotificationJobDetailRow } from "./notification-job-detail-row";

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
        <DialogHeader className="border-b bg-muted/30 px-5 py-4">
          <DialogTitle className="px-0 pt-0 text-base">
            {t("settings.notifications.jobDetail.title")}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="flex flex-col gap-5 px-5 py-5">
            <section>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("settings.notifications.jobDetail.sectionOverview")}
              </p>
              <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-4">
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
                  value={format(
                    new Date(job.scheduledFor),
                    "dd.MM.yyyy HH:mm:ss",
                  )}
                />
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.createdAt")}
                  value={format(new Date(job.createdAt), "dd.MM.yyyy HH:mm:ss")}
                />
                {job.processedAt ? (
                  <NotificationJobDetailRow
                    label={t("settings.notifications.jobDetail.processedAt")}
                    value={format(
                      new Date(job.processedAt),
                      "dd.MM.yyyy HH:mm:ss",
                    )}
                  />
                ) : null}
                <NotificationJobDetailRow
                  label={t("settings.notifications.jobDetail.updatedAt")}
                  value={format(new Date(job.updatedAt), "dd.MM.yyyy HH:mm:ss")}
                />
              </div>
            </section>

            {message ? (
              <section>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("settings.notifications.jobDetail.sectionContent")}
                </p>
                <div className="mt-2 rounded-xl border border-dashed border-border/80 bg-background p-4">
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
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("settings.notifications.jobDetail.sectionDelivery")}
                </p>
                <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-4">
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
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-500">
                  {t("settings.notifications.jobDetail.blockedReason")}
                </p>
                <p className="mt-1.5 text-sm text-amber-500">
                  {job.blockedReason}
                </p>
              </div>
            ) : null}
            {job.lastError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-destructive">
                  {t("settings.notifications.jobDetail.lastError")}
                </p>
                <p className="mt-1.5 text-sm text-destructive">
                  {job.lastError}
                </p>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
