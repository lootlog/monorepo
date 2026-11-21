import { Link } from "@tanstack/react-router";
import type {
  CatalogReportDtoOutputStatus,
  CatalogReportedSubjectDtoOutput,
} from "@lootlog/client/catalog";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import { itemIconUrl } from "@lootlog/ui/lib/item-icon-url";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { t } from "@/i18n/messages";
import { itemPageParams, npcPageParams } from "@/lib/catalog-links";

const reportedAt = new Intl.DateTimeFormat(PRODUCT_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

type ReportedSubjectCardProps = {
  subject: CatalogReportedSubjectDtoOutput;
  /** The status this subject's reports are being moved to, while it saves. */
  pendingStatus: CatalogReportDtoOutputStatus | undefined;
  onReview: (status: CatalogReportDtoOutputStatus) => void;
};

/** A reported page and what its reporters said, with the moderator's choices. */
export function ReportedSubjectCard({
  subject,
  pendingStatus,
  onReview,
}: ReportedSubjectCardProps) {
  const page = { id: subject.subjectId, name: subject.name ?? "" };
  const name = subject.name ?? t("moderation.unknownName", { id: page.id });
  const isOpen = subject.reports[0]?.status === "OPEN";

  const actions: ReadonlyArray<CatalogReportDtoOutputStatus> = isOpen
    ? ["RESOLVED", "REJECTED"]
    : ["OPEN"];

  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {subject.subjectType === "ITEM" ? (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-background">
              {subject.icon ? (
                <img
                  src={itemIconUrl(subject.icon)}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 [image-rendering:pixelated]"
                />
              ) : null}
            </span>
          ) : subject.icon ? (
            <NpcPortrait icon={subject.icon} size="sm" />
          ) : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            {subject.subjectType === "ITEM" ? (
              <Link
                to="/items/$itemSlug"
                params={itemPageParams(page)}
                className="truncate font-semibold hover:underline"
              >
                {name}
              </Link>
            ) : (
              <Link
                to="/npcs/$npcSlug"
                params={npcPageParams(page)}
                className="truncate font-semibold hover:underline"
              >
                {name}
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              {t(`moderation.subjectTypes.${subject.subjectType}`)} ·{" "}
              {t("moderation.reportCount", { count: subject.reports.length })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === "REJECTED" ? "outline" : "default"}
              disabled={pendingStatus !== undefined}
              onClick={() => onReview(status)}
            >
              <ButtonLoadingContent loading={pendingStatus === status}>
                {t(`moderation.actions.${status}`)}
              </ButtonLoadingContent>
            </Button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border/60">
        {subject.reports.map((report) => (
          <li
            key={report.id}
            className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge variant="secondary">
                {t(`reports.reasons.${report.reason}.title`)}
              </Badge>
              <time
                dateTime={report.createdAt}
                className="text-xs text-muted-foreground"
              >
                {reportedAt.format(new Date(report.createdAt))}
              </time>
            </div>
            {report.comment ? (
              <p className="text-sm whitespace-pre-line text-pretty">
                {report.comment}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </li>
  );
}
