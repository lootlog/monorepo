import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatStatisticsDateHour } from "@/components/common/kill-analytics/format-statistics-date";

type StatisticsCharacterHistoryNoteProps = {
  trackedSince: string;
};

/** Says when a character's history starts, so the days before it are not read as zero. */
export function StatisticsCharacterHistoryNote({
  trackedSince,
}: StatisticsCharacterHistoryNoteProps) {
  const { t } = useTranslation();

  return (
    <p
      role="status"
      className="flex items-start gap-2 p-3 text-sm text-muted-foreground"
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {t("statistics.characterHistory", {
        date: formatStatisticsDateHour(trackedSince),
      })}
    </p>
  );
}
