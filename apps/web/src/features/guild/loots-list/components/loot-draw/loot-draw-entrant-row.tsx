import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { MAX_LOOT_DRAW_TICKETS } from "@lootlog/domain/loot-draw";
import { Minus, Plus, Trophy, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatRosterPlayerDetail } from "@/features/guild/loots-list/components/loots-list/format-roster-player-detail";
import { lootDrawSegmentColor } from "./loot-draw-colors";

export type LootDrawEntrantSource = "WINNER" | "PARTY" | "MAP" | "MANUAL";

const SOURCE_LABEL_KEYS = {
  WINNER: "loots.details.draw.winnerSource",
  PARTY: "loots.details.draw.partySource",
  MAP: "loots.details.draw.mapSource",
  MANUAL: "loots.details.draw.manualSource",
} as const;

/** An entrant beside their slice colour, tickets and chance of winning. */
export const LootDrawEntrantRow = ({
  index,
  entrant,
  totalTickets,
  isWinner = false,
  defaultTickets,
  onTicketsChange,
  onRemove,
}: {
  index: number;
  entrant: {
    name: string;
    prof: string | null;
    lvl: number | null;
    source: LootDrawEntrantSource;
    tickets: number;
  };
  totalTickets: number;
  isWinner?: boolean;
  /** The tickets the draw's rule gives, shown when a manager changed them. */
  defaultTickets?: number;
  onTicketsChange?: (tickets: number) => void;
  onRemove?: () => void;
}) => {
  const { t } = useTranslation();
  const detail = formatRosterPlayerDetail(t, entrant);

  const percent =
    totalTickets > 0
      ? Math.round((entrant.tickets / totalTickets) * 1000) / 10
      : 0;

  return (
    <li
      className={cn(
        "flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4",
        isWinner && "bg-primary/10",
      )}
    >
      <span
        aria-hidden="true"
        className="size-3 shrink-0 rounded-sm"
        style={{ background: lootDrawSegmentColor(index) }}
      />
      <div className="min-w-0 flex-1 basis-36">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium leading-tight">
          {isWinner && (
            <Trophy
              aria-hidden="true"
              className="size-3.5 shrink-0 text-primary"
            />
          )}
          <span className="truncate">{entrant.name}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[t(SOURCE_LABEL_KEYS[entrant.source]), detail]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {/* On a phone the chance and tickets drop under the name. */}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {t("loots.details.draw.chance", { percent })}
          </p>
          {onTicketsChange &&
            defaultTickets !== undefined &&
            defaultTickets !== entrant.tickets && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => onTicketsChange(defaultTickets)}
              >
                {t("loots.details.draw.defaultTickets", {
                  count: defaultTickets,
                })}
              </button>
            )}
        </div>
        {/* A result keeps the stepper's room, so its rows match the editor's
            and a spin moves nothing. */}
        {!onTicketsChange && (
          <p className="flex h-[34px] w-24 shrink-0 items-center justify-center border border-transparent text-xs tabular-nums text-muted-foreground">
            {t("loots.details.draw.tickets", { count: entrant.tickets })}
          </p>
        )}
        {onTicketsChange && (
          <div
            role="group"
            aria-label={t("loots.details.draw.ticketsOf", {
              name: entrant.name,
            })}
            className="flex w-24 shrink-0 items-center justify-between rounded-md border border-border"
          >
            <Button
              size="icon-sm"
              variant="ghost"
              className="rounded-r-none"
              disabled={entrant.tickets <= 1}
              onClick={() => onTicketsChange(entrant.tickets - 1)}
              aria-label={t("loots.details.draw.fewerTickets")}
            >
              <Minus className="size-3.5" />
            </Button>
            <span
              aria-live="polite"
              className="min-w-7 text-center text-sm font-semibold tabular-nums"
            >
              {entrant.tickets}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              className="rounded-l-none"
              disabled={entrant.tickets >= MAX_LOOT_DRAW_TICKETS}
              onClick={() => onTicketsChange(entrant.tickets + 1)}
              aria-label={t("loots.details.draw.moreTickets")}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        )}
        {onRemove && (
          <Button
            size="icon-sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground"
            onClick={onRemove}
            aria-label={t("loots.details.draw.remove", { name: entrant.name })}
          >
            <X className="size-4" />
          </Button>
        )}
        {/* Every row keeps the remove button's room, so the columns line up. */}
        {!onRemove && <span aria-hidden="true" className="size-8 shrink-0" />}
      </div>
    </li>
  );
};
