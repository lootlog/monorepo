import type { LootDrawResponseDto } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

/** Voided results of one item, newest first, with who voided them and why. */
export const LootDrawHistory = ({
  draws,
}: {
  draws: readonly LootDrawResponseDto[];
}) => {
  const { t } = useTranslation();

  if (draws.length === 0) return null;

  return (
    <section className="grid gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("loots.details.draw.history", { count: draws.length })}
      </h3>
      <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border">
        {draws.map((draw) => (
          <li key={draw.id} className="px-3 py-2 text-sm sm:px-4">
            <p className="font-medium text-muted-foreground line-through">
              {t("loots.details.draw.wonBy", {
                name: draw.entrants[draw.winnerIndex]?.name ?? "",
              })}
            </p>
            {draw.voided && (
              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                {t("loots.details.draw.voidedBy", {
                  name: draw.voided.by.name,
                  date: timestampToDate(draw.voided.at),
                  reason: draw.voided.reason,
                })}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
