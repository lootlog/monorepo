import type { LootDrawResponseDto } from "@lootlog/client/main";
import { Trophy } from "lucide-react";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LootDrawEntrantRow } from "./loot-draw-entrant-row";
import { LootDrawLayout } from "./loot-draw-layout";
import { LootDrawVoidForm } from "./loot-draw-void-form";
import { LootDrawWheel } from "./loot-draw-wheel";
import type { useLootDraws } from "./use-loot-draws";

/**
 * A standing result in the editor's frame: the wheel settled on the winner,
 * who is announced where the spin button stood.
 */
export const LootDrawResult = ({
  draw,
  draws,
  spin,
  canManage,
  onRevealed,
}: {
  draw: LootDrawResponseDto;
  draws: ReturnType<typeof useLootDraws>;
  /** Spins the wheel to the result, for the draw the viewer just ran. */
  spin: boolean;
  canManage: boolean;
  /** Called when a spin settles and the winner shows. */
  onRevealed?: () => void;
}) => {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  // Without motion the wheel never spins, so the winner shows at once.
  const [revealed, setRevealed] = useState(!spin || reducedMotion);
  const winner = draw.entrants[draw.winnerIndex];

  return (
    <LootDrawLayout
      wheel={
        <LootDrawWheel
          entrants={draw.entrants}
          ticketOrder={draw.ticketOrder}
          roll={draw.roll}
          spin={spin}
          onSettled={() => {
            setRevealed(true);
            onRevealed?.();
          }}
          className="max-lg:max-w-48"
        />
      }
      entrantsCount={draw.entrants.length}
      entrants={draw.entrants.map((entrant, index) => (
        <LootDrawEntrantRow
          key={`${entrant.name}:${index}`}
          index={index}
          entrant={entrant}
          totalTickets={draw.ticketOrder.length}
          isWinner={revealed && index === draw.winnerIndex}
        />
      ))}
      footer={
        // The live region stays mounted so the winner is announced on reveal.
        <div role="status" aria-live="polite" className="min-w-0 flex-1">
          {winner && revealed ? (
            <div className="flex min-w-0 items-center gap-3">
              <Trophy
                aria-hidden="true"
                className="size-5 shrink-0 text-primary"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {t("loots.details.draw.winner", { name: winner.name })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("loots.details.draw.drawnBy", {
                    name: draw.createdBy.name,
                    date: timestampToDate(draw.createdAt),
                  })}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("loots.details.draw.spinning")}
            </p>
          )}
        </div>
      }
      below={
        canManage && revealed ? (
          <LootDrawVoidForm key={draw.id} draw={draw} draws={draws} />
        ) : undefined
      }
    />
  );
};
