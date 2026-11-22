import type { LootDrawResponseDto } from "@lootlog/client/main";
import { Trophy } from "lucide-react";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { MemberIdentity } from "@/components/common/member-identity";
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
  canVoid,
  onRevealed,
}: {
  draw: LootDrawResponseDto;
  draws: ReturnType<typeof useLootDraws>;
  /** Spins the wheel to the result, for the draw the viewer just ran. */
  spin: boolean;
  /** Members who manage loots may overrule a result. */
  canVoid: boolean;
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
          drawId={draw.id}
          spin={spin}
          onSettled={() => {
            setRevealed(true);
            onRevealed?.();
          }}
          className="max-lg:max-w-64"
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
                  <Trans
                    i18nKey="loots.details.draw.drawnBy"
                    values={{ date: timestampToDate(draw.createdAt) }}
                    components={{
                      member: (
                        <MemberIdentity
                          member={{ memberId: draw.createdBy.id }}
                          fallback={{ name: draw.createdBy.name }}
                          display="name"
                          nameClassName="text-xs font-normal"
                        />
                      ),
                    }}
                  />
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
        canVoid && revealed ? (
          <LootDrawVoidForm key={draw.id} draw={draw} draws={draws} />
        ) : undefined
      }
    />
  );
};
