import type { LootDrawResponseDto } from "@lootlog/client/main";
import { Trophy } from "lucide-react";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LootDrawEntrantRow } from "./loot-draw-entrant-row";
import { LootDrawVoidForm } from "./loot-draw-void-form";
import { LootDrawWheel } from "./loot-draw-wheel";
import type { useLootDraws } from "./use-loot-draws";

/** A standing result: the settled wheel, the winner and every entrant. */
export const LootDrawResult = ({
  draw,
  draws,
  spin,
  canManage,
}: {
  draw: LootDrawResponseDto;
  draws: ReturnType<typeof useLootDraws>;
  /** Spins the wheel to the result, for the draw the viewer just ran. */
  spin: boolean;
  canManage: boolean;
}) => {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  // Without motion the wheel never spins, so the winner shows at once.
  const [revealed, setRevealed] = useState(!spin || reducedMotion);
  const winner = draw.entrants[draw.winnerIndex];
  const totalTickets = draw.ticketOrder.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <LootDrawWheel
        entrants={draw.entrants}
        ticketOrder={draw.ticketOrder}
        roll={draw.roll}
        spin={spin}
        onSettled={() => setRevealed(true)}
        className="max-lg:max-w-48"
      />
      <div className="grid min-w-0 gap-3">
        {/* The live region stays mounted so the winner is announced on reveal. */}
        <div role="status" aria-live="polite">
          {winner && revealed ? (
            <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-3 sm:px-4">
              <Trophy
                aria-hidden="true"
                className="size-5 shrink-0 text-primary"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {t("loots.details.draw.winner", { name: winner.name })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("loots.details.draw.drawnBy", {
                    name: draw.createdBy.name,
                    date: timestampToDate(draw.createdAt),
                  })}
                </p>
              </div>
            </div>
          ) : (
            <p className="flex min-h-15 items-center px-1 text-sm text-muted-foreground">
              {t("loots.details.draw.spinning")}
            </p>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <p className="border-b border-border px-3 py-2 text-sm font-semibold sm:px-4">
            {t("loots.details.draw.entrants", { count: draw.entrants.length })}
          </p>
          <ul className="divide-y divide-border/50">
            {draw.entrants.map((entrant, index) => (
              <LootDrawEntrantRow
                key={`${entrant.name}:${index}`}
                index={index}
                entrant={entrant}
                totalTickets={totalTickets}
                isWinner={revealed && index === draw.winnerIndex}
              />
            ))}
          </ul>
        </div>
        {canManage && (
          <LootDrawVoidForm key={draw.id} draw={draw} draws={draws} />
        )}
      </div>
    </div>
  );
};
