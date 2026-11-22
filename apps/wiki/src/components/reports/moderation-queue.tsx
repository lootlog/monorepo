import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type CatalogReportDtoOutputStatus,
  CatalogReportDtoOutputStatus as ReportStatus,
  getCatalogReportsControllerListQueryKey,
  useCatalogReportsControllerList,
  useCatalogReportsControllerReview,
} from "@lootlog/client/catalog";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { PageHeader } from "@/components/common/page-header";
import { ReportedSubjectCard } from "@/components/reports/reported-subject-card";
import { useSignedInCatalogRequest } from "@/hooks/use-signed-in-catalog-request";
import { t } from "@/i18n/messages";

const PAGE_SIZE = 20;

const STATUSES = Object.values(ReportStatus);

export function ModerationQueue() {
  const queryClient = useQueryClient();
  const request = useSignedInCatalogRequest();
  const [status, setStatus] = useState<CatalogReportDtoOutputStatus>("OPEN");
  const [offset, setOffset] = useState(0);
  const params = { status, limit: PAGE_SIZE, offset };

  const { data, isError, isPending } = useCatalogReportsControllerList(params, {
    request,
  });

  const [reviewing, setReviewing] = useState<{
    key: string;
    status: CatalogReportDtoOutputStatus;
  }>();

  const review = useCatalogReportsControllerReview({
    request,
    mutation: {
      onSuccess: () => {
        if (data?.subjects.length === 1 && offset > 0) {
          setOffset(offset - PAGE_SIZE);
        }
      },
      onSettled: () => {
        setReviewing(undefined);
        void queryClient.invalidateQueries({
          queryKey: getCatalogReportsControllerListQueryKey(),
        });
      },
    },
  });

  const total = data?.total ?? 0;
  const lastShown = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-6 py-6">
      <PageHeader
        title={t("moderation.title")}
        description={t("moderation.description")}
      />

      <ToggleGroup
        aria-label={t("moderation.statusLabel")}
        variant="outline"
        size="sm"
        spacing={1.5}
        className="flex-wrap"
        value={[status]}
        onValueChange={([pressed]) => {
          const next = STATUSES.find((value) => value === pressed);

          if (!next) return;
          setStatus(next);
          setOffset(0);
          review.reset();
        }}
      >
        {STATUSES.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {t(`moderation.statuses.${value}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {review.error ? (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorStatus(review.error) === 409
            ? t("moderation.reopenConflict")
            : t("moderation.reviewFailed")}
        </p>
      ) : null}

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("moderation.loadError")}
        </p>
      ) : isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : data.subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t(`moderation.empty.${status}`)}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.subjects.map((subject) => {
            const key = `${subject.subjectType}:${subject.gameVersion}:${subject.subjectId}`;

            return (
              <ReportedSubjectCard
                key={key}
                subject={subject}
                pendingStatus={
                  reviewing?.key === key ? reviewing.status : undefined
                }
                onReview={(next) => {
                  setReviewing({ key, status: next });
                  review.mutate({
                    data: {
                      reportIds: subject.reports.map(({ id }) => id),
                      status: next,
                    },
                  });
                }}
              />
            );
          })}
        </ul>
      )}

      {total > PAGE_SIZE ? (
        <nav
          aria-label={t("moderation.pagination")}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4"
        >
          <span className="text-sm text-muted-foreground tabular-nums">
            {t("moderation.range", {
              from: offset + 1,
              to: lastShown,
              total,
            })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              {t("moderation.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={lastShown >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              {t("moderation.next")}
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
