import { formatNumber } from "@lootlog/domain/locale";
import { Button } from "@lootlog/ui/components/button";
import { t } from "@/i18n/messages";
import type { FightHighlight } from "@/lib/fight/fight-highlights";

type FightHighlightsProps = {
  highlights: readonly FightHighlight[];
  selected: number | null;
  onSelect: (index: number) => void;
};

export function FightHighlights({
  highlights,
  selected,
  onSelect,
}: FightHighlightsProps) {
  return (
    <div
      role="group"
      aria-label={t("fightPage.highlightsTitle")}
      className="flex flex-wrap gap-1"
    >
      {highlights.map((highlight) => (
        <Button
          key={highlight.id}
          size="xs"
          variant={highlight.index === selected ? "secondary" : "outline"}
          aria-pressed={highlight.index === selected}
          onClick={() => onSelect(highlight.index)}
        >
          {t(`fightPage.highlights.${highlight.id}`)}
          <span className="text-muted-foreground tabular-nums">
            {t("fightPage.highlightNumber", {
              number: formatNumber(highlight.index + 1),
            })}
          </span>
        </Button>
      ))}
    </div>
  );
}
