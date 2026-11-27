import type { BingoBoardDetailResponseDtoRecentActivityItem } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";
import { cn } from "cn";
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
      <EmptyState compact icon={Activity} title={t("bingo.activity.empty")} />
    );
  }

  return (
    <ol>
      {items.map((item) => (
        <li
          key={item.id}
          data-list-tile
          className={cn(
            "flex flex-col gap-0.5 py-2.5",
            LIST_TILE_RULE_CLASS,
            LIST_TILE_INSET_CLASS,
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-medium">
              {item.member.name}
              <span className="text-muted-foreground"> · </span>
              <span className="text-primary">{item.tileTitle}</span>
            </span>
            <time
              dateTime={item.occurredAt}
              className="shrink-0 text-2xs tabular-nums text-muted-foreground"
            >
              {timeFormatter.format(new Date(item.occurredAt))}
            </time>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{item.summary}</span>
            <span className="flex items-center gap-1.5">
              <span className="tabular-nums">
                {item.previousCount} → {item.newCount}
              </span>
              {item.completedTile && (
                <Badge variant="ready" size="sm">
                  {t("bingo.activity.tileCompletedBadge")}
                </Badge>
              )}
              {item.completedLineCount > 0 && (
                <Badge variant="tinted" size="sm">
                  {t("bingo.activity.lineCompletedBadge", {
                    count: item.completedLineCount,
                  })}
                </Badge>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
};
