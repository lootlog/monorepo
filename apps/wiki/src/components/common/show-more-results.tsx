import { ChevronDown } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { t } from "@/i18n/messages";
import { formatNumber } from "@lootlog/domain/locale";

const PRELOAD_MARGIN = "600px";

type ShowMoreResultsProps = {
  shown: number;
  total: number;
  next: number;
  isLoading: boolean;
  onShowMore: () => void;
};

export function ShowMoreResults({
  shown,
  total,
  next,
  isLoading,
  onShowMore,
}: ShowMoreResultsProps) {
  const observe = (element: HTMLDivElement | null) => {
    if (!element || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onShowMore();
      },
      { rootMargin: PRELOAD_MARGIN },
    );

    observer.observe(element);

    return () => observer.disconnect();
  };

  return (
    <div
      ref={observe}
      className="flex flex-col items-center gap-4 border-t border-border/50 pt-6"
    >
      <div className="flex w-full max-w-64 flex-col gap-2">
        <div
          aria-hidden="true"
          className="h-1 overflow-hidden rounded-full bg-border/70"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min((shown / total) * 100, 100)}%` }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground tabular-nums">
          {t("search.shown", {
            shown: formatNumber(shown),
            total: formatNumber(total),
          })}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="min-w-56"
        loading={isLoading}
        icon={<ChevronDown />}
        onClick={onShowMore}
      >
        {t("search.showNext", { count: next })}
      </Button>
    </div>
  );
}
