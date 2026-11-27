import type { BingoBoardDetailResponseDtoRecentActivityItem } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

type BingoActivityFeedProps = {
  readonly items: ReadonlyArray<BingoBoardDetailResponseDtoRecentActivityItem>;
};

const timeFormatter = new Intl.DateTimeFormat(PRODUCT_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const BingoActivityFeed = ({ items }: BingoActivityFeedProps) => {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={Activity}
        title={t("bingo.activity.title")}
        description={t("bingo.activity.empty")}
      />
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1 px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium text-foreground">
                {item.member.name}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="truncate text-xs font-medium text-primary">
                {item.tileTitle}
              </span>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {timeFormatter.format(new Date(item.occurredAt))}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{item.summary}</span>
            <div className="flex items-center gap-1.5">
              <span className="tabular-nums">
                {item.previousCount} → {item.newCount}
              </span>
              {item.completedTile ? (
                <Badge variant="ready" className="px-1.5 py-0 text-[10px]">
                  {t("bingo.activity.tileCompletedBadge")}
                </Badge>
              ) : null}
              {item.completedLineCount > 0 ? (
                <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                  {t("bingo.activity.lineCompletedBadge", {
                    count: item.completedLineCount,
                  })}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
