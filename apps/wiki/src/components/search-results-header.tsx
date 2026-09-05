import { t } from "@/i18n/messages";
export function SearchResultsHeader({
  count,
  start,
  end,
}: {
  count: number;
  start: number;
  end: number;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-foreground">
        {t("search.results", { count })}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("search.showingRange", { end, start })}
      </p>
    </div>
  );
}
