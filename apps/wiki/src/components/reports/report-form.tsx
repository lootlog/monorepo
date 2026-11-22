import { type FormEvent, useId, useState } from "react";
import {
  type CatalogReportDtoOutput,
  type CatalogReportDtoOutputReason,
  type CatalogReportsControllerGetOwnParams,
  type CreateCatalogReportRequest,
  getCatalogReportsControllerGetOwnQueryKey,
  useCatalogReportsControllerCreate,
  useCatalogReportsControllerWithdraw,
} from "@lootlog/client/catalog";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { Button } from "@lootlog/ui/components/button";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import { DialogFooter } from "@lootlog/ui/components/dialog";
import { Label } from "@lootlog/ui/components/label";
import { OptionCardGroup } from "@lootlog/ui/components/option-card-group";
import { Textarea } from "@lootlog/ui/components/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useSignedInCatalogRequest } from "@/hooks/use-signed-in-catalog-request";
import { t } from "@/i18n/messages";
import {
  REPORT_COMMENT_MAX_LENGTH,
  REPORT_REASONS,
} from "@/lib/catalog-reports";

type ReportFormProps = {
  subject: CatalogReportsControllerGetOwnParams;
  report: CatalogReportDtoOutput | null;
  onDone: () => void;
};

export function ReportForm({ subject, report, onDone }: ReportFormProps) {
  const queryClient = useQueryClient();
  const request = useSignedInCatalogRequest();
  const reasonsId = useId();
  const commentId = useId();
  const reasons = REPORT_REASONS[subject.subjectType];

  const [reason, setReason] = useState<CatalogReportDtoOutputReason>(
    report?.reason ?? reasons[0],
  );

  const [comment, setComment] = useState(report?.comment ?? "");
  const ownKey = getCatalogReportsControllerGetOwnQueryKey(subject);

  const create = useCatalogReportsControllerCreate({
    request,
    mutation: {
      onSuccess: (saved) => {
        queryClient.setQueryData(ownKey, { report: saved });
        onDone();
      },
    },
  });

  const withdraw = useCatalogReportsControllerWithdraw({
    request,
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(ownKey, { report: null });
        onDone();
      },
    },
  });

  const needsComment = reason === "OTHER" && comment.trim() === "";
  const isBusy = create.isPending || withdraw.isPending;
  const failure = create.error ?? withdraw.error;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (needsComment || isBusy) return;

    const data: CreateCatalogReportRequest = { ...subject, reason };
    const details = comment.trim();

    if (details) data.comment = details;

    create.mutate({ data });
  };

  return (
    <form className="flex flex-col gap-5 px-4 pb-4" onSubmit={submit}>
      {report ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("reports.pending")}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <p id={reasonsId} className="text-sm font-medium">
          {t("reports.reasonLabel")}
        </p>
        <OptionCardGroup
          aria-labelledby={reasonsId}
          className="sm:grid-cols-1"
          disabled={isBusy}
          value={reason}
          onChange={setReason}
          options={reasons.map((value) => ({
            value,
            title: t(`reports.reasons.${value}.title`),
            description: t(`reports.reasons.${value}.${subject.subjectType}`),
          }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={commentId}>
          {reason === "OTHER"
            ? t("reports.commentRequiredLabel")
            : t("reports.commentLabel")}
        </Label>
        <Textarea
          id={commentId}
          value={comment}
          maxLength={REPORT_COMMENT_MAX_LENGTH}
          rows={3}
          disabled={isBusy}
          required={reason === "OTHER"}
          placeholder={t("reports.commentPlaceholder")}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>

      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorStatus(failure) === 429
            ? t("reports.limitReached")
            : t("reports.sendFailed")}
        </p>
      ) : null}

      <DialogFooter className="sm:justify-between">
        {report ? (
          <Button
            type="button"
            variant="ghost"
            disabled={isBusy}
            onClick={() =>
              withdraw.mutate({ pathParams: { reportId: report.id } })
            }
          >
            <ButtonLoadingContent loading={withdraw.isPending}>
              {t("reports.withdraw")}
            </ButtonLoadingContent>
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={needsComment || isBusy}>
          <ButtonLoadingContent loading={create.isPending}>
            {report ? t("reports.update") : t("reports.send")}
          </ButtonLoadingContent>
        </Button>
      </DialogFooter>
    </form>
  );
}
