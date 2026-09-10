import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";

/**
 * One badge per fight. A log that names no winner is reported as a flee,
 * because the decisive cases already resolve into a win or a loss.
 */
export function GroupFightResultBadge({
  result,
}: {
  result: "WIN" | "LOSS" | "DRAW";
}) {
  const { t } = useTranslation();

  if (result === "WIN") return <Badge>{t("groupFights.results.WIN")}</Badge>;
  if (result === "LOSS")
    return <Badge variant="destructive">{t("groupFights.results.LOSS")}</Badge>;
  return (
    <Badge
      variant="outline"
      className="border-amber-500/40 text-amber-600 dark:text-amber-400"
    >
      {t("groupFights.results.FLEE")}
    </Badge>
  );
}
