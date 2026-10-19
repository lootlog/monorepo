import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";

type Props = {
  expanded: boolean;
  /** Events past the first few, folded while collapsed. */
  hiddenCount: number;
  onToggle: () => void;
};

/** The feed's last tile: unfolds older events, or folds them back. */
export function LiveFeedShowOlder({ expanded, hiddenCount, onToggle }: Props) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "flex h-10 w-full items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/20 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        LIST_TILE_RULE_CLASS,
      )}
    >
      {expanded
        ? t("statistics.feedShowLess")
        : t("statistics.feedShowOlder", { count: hiddenCount })}
      <ChevronDown
        aria-hidden
        className={cn(
          "size-3.5 transition-transform motion-reduce:transition-none",
          expanded && "rotate-180",
        )}
      />
    </button>
  );
}
