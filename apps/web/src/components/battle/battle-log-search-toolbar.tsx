import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { ChangeEvent, FC } from "react";
import { useTranslation } from "react-i18next";

export type BattleLogSearchToolbarProps = {
  query: string;
  currentIndex: number;
  totalMatches: number;
  onQueryChange: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export const BattleLogSearchToolbar: FC<BattleLogSearchToolbarProps> = ({
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

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onQueryChange(event.target.value);
  };

  return (
    <div className="min-h-[49px] border-b bg-background px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={handleQueryChange}
            aria-label={t("battlePanel.single.log.search.label")}
            placeholder={t("battlePanel.single.log.search.placeholder")}
            className="h-8 pl-9"
          />
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span
            className="min-w-14 text-center text-xs font-medium tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {t("battlePanel.single.log.search.counter", {
              current: currentMatchNumber,
              total: totalMatches,
            })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label={t("battlePanel.single.log.search.previous")}
              disabled={!hasResults}
              onClick={onPrevious}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label={t("battlePanel.single.log.search.next")}
              disabled={!hasResults}
              onClick={onNext}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
