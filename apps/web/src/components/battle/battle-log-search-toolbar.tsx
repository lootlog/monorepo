import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "@/components/common/inline-search-field";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FC, Ref } from "react";
import { useTranslation } from "react-i18next";

export type BattleLogSearchToolbarProps = {
  ref?: Ref<HTMLDivElement>;
  query: string;
  currentIndex: number;
  totalMatches: number;
  onQueryChange: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

/**
 * The log's first row, like a list toolbar: a borderless search with the match counter and
 * arrows. It pins at `--battle-log-sticky-top`, under the chart pinned above the log, or else
 * under the page's pinned bars.
 */
export const BattleLogSearchToolbar: FC<BattleLogSearchToolbarProps> = ({
  ref,
  query,
  currentIndex,
  totalMatches,
  onQueryChange,
  onPrevious,
  onNext,
}) => {
  const { t } = useTranslation();
  const hasResults = query.trim().length > 0 && totalMatches > 0;
  const currentMatchNumber = hasResults ? currentIndex + 1 : 0;

  return (
    <div
      ref={ref}
      data-battle-log-toolbar=""
      data-list-tile
      className={cn(
        "sticky top-[var(--battle-log-sticky-top,calc(var(--page-sticky-top,0px)+var(--filter-bar-height,0px)))] z-10 flex min-h-12 items-center gap-x-4 bg-background py-2 backdrop-blur-sm transition-colors has-[input:focus-visible]:border-primary motion-reduce:transition-none",
        LIST_TILE_RULE_CLASS,
        LIST_TILE_INSET_CLASS,
      )}
    >
      <InlineSearchField
        className="min-w-0"
        clearLabel={t("common.clear")}
        onClear={query ? () => onQueryChange("") : undefined}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label={t("battlePanel.single.log.search.label")}
          placeholder={t("battlePanel.single.log.search.placeholder")}
          className={INLINE_SEARCH_INPUT_CLASS}
        />
      </InlineSearchField>
      <div className="flex shrink-0 items-center gap-1">
        <span
          className="min-w-12 text-center text-xs font-medium tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {t("battlePanel.single.log.search.counter", {
            current: currentMatchNumber,
            total: totalMatches,
          })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("battlePanel.single.log.search.previous")}
          disabled={!hasResults}
          onClick={onPrevious}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("battlePanel.single.log.search.next")}
          disabled={!hasResults}
          onClick={onNext}
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>
    </div>
  );
};
