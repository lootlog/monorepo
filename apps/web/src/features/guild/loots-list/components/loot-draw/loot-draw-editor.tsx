import { Button } from "@lootlog/ui/components/button";
import {
  groupedLootDrawTicketOrder,
  shuffleLootDrawTicketOrder,
} from "@lootlog/domain/loot-draw";
import type { LootDrawResponseDto } from "@lootlog/client/main";
import type { ApiError } from "@lootlog/client/transport";
import { ArrowDownWideNarrow, Dices, RotateCcw, Shuffle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Item, Loot } from "@/lib/loots/loot-types";
import {
  lootDrawAddError,
  lootDrawPlayerKey,
  type LootDrawDraftEntrant,
  type LootDrawSetup,
} from "./build-loot-draw-entrants";
import { LootDrawAddPlayerForm } from "./loot-draw-add-player-form";
import { LootDrawEntrantRow } from "./loot-draw-entrant-row";
import { LootDrawLayout } from "./loot-draw-layout";
import { LootDrawWheel } from "./loot-draw-wheel";
import type { useLootDraws } from "./use-loot-draws";

/**
 * The draw before it runs: the winner from the game stays, outsiders can be
 * removed or added, anybody's tickets changed, and the wheel shuffled.
 */
export const LootDrawEditor = ({
  loot,
  item,
  setup,
  draws,
  onSpinStart,
  onSpinFailed,
  onDrawn,
}: {
  loot: Loot;
  item: Item;
  setup: LootDrawSetup;
  draws: ReturnType<typeof useLootDraws>;
  onSpinStart: () => void;
  onSpinFailed: () => void;
  onDrawn: (draw: LootDrawResponseDto) => void;
}) => {
  const { t } = useTranslation();
  const [entrants, setEntrants] = useState(setup.entrants);
  const [isShuffled, setIsShuffled] = useState(false);

  const [ticketOrder, setTicketOrder] = useState(() =>
    groupedLootDrawTicketOrder(setup.entrants),
  );

  const { guildId, createDraw } = draws;

  // Any change of entrants or tickets lays the wheel out again, shuffled or not.
  const update = (next: LootDrawDraftEntrant[], shuffled = isShuffled) => {
    const grouped = groupedLootDrawTicketOrder(next);

    setEntrants(next);
    setIsShuffled(shuffled);
    setTicketOrder(shuffled ? shuffleLootDrawTicketOrder(grouped) : grouped);
  };

  const outsiders = entrants.filter(({ source }) => source !== "WINNER");

  const mapOutsidersRemoved =
    setup.entrants.length - 1 >
    outsiders.filter(({ source }) => source === "MAP").length;

  const spin = () => {
    if (!guildId) return;

    onSpinStart();
    createDraw.mutate(
      {
        pathParams: { guildId, lootId: loot.id },
        data: {
          itemHid: item.hid,
          entrants: entrants.map(
            ({ key: _key, defaultTickets: _default, ...entrant }) => entrant,
          ),
          ticketOrder,
        },
      },
      {
        onSuccess: onDrawn,
        onError: (error: ApiError) => {
          onSpinFailed();
          toast.error(
            t(
              error.status === 409
                ? "loots.details.draw.drawConflict"
                : "loots.details.draw.drawError",
            ),
          );
        },
      },
    );
  };

  return (
    <LootDrawLayout
      wheel={
        <LootDrawWheel
          entrants={entrants}
          ticketOrder={ticketOrder}
          roll={null}
          className="max-lg:max-w-48"
        />
      }
      wheelActions={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => update(entrants, true)}
          >
            <Shuffle className="size-4" />
            {t("loots.details.draw.shuffle")}
          </Button>
          {isShuffled && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => update(entrants, false)}
            >
              <ArrowDownWideNarrow className="size-4" />
              {t("loots.details.draw.unshuffle")}
            </Button>
          )}
        </>
      }
      entrantsCount={entrants.length}
      entrantsAction={
        mapOutsidersRemoved && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              update([
                ...setup.entrants.map((entrant) =>
                  entrant.source === "WINNER"
                    ? (entrants.find(({ source }) => source === "WINNER") ??
                      entrant)
                    : entrant,
                ),
                ...outsiders.filter(({ source }) => source === "MANUAL"),
              ])
            }
          >
            <RotateCcw className="size-4" />
            {t("loots.details.draw.restore")}
          </Button>
        )
      }
      entrants={entrants.map((entrant, index) => (
        <LootDrawEntrantRow
          key={entrant.key}
          index={index}
          entrant={entrant}
          totalTickets={ticketOrder.length}
          defaultTickets={entrant.defaultTickets}
          onTicketsChange={(tickets) =>
            update(
              entrants.map((current, position) =>
                position === index ? { ...current, tickets } : current,
              ),
            )
          }
          onRemove={
            entrant.source === "WINNER"
              ? undefined
              : () =>
                  update(entrants.filter((_, position) => position !== index))
          }
        />
      ))}
      footer={
        <>
          <p className="text-xs text-muted-foreground">
            {outsiders.length === 0 && t("loots.details.draw.noOutsiders")}
          </p>
          <Button
            onClick={spin}
            disabled={outsiders.length === 0 || createDraw.isPending}
            loading={createDraw.isPending}
          >
            <Dices className="size-4" />
            {t("loots.details.draw.spin")}
          </Button>
        </>
      }
      below={
        <div className="overflow-hidden rounded-lg border border-border">
          {(!setup.hasMapPlayers || setup.ineligibleCount > 0) && (
            <p className="border-b border-border/50 px-3 py-2 text-xs text-muted-foreground sm:px-4">
              {setup.hasMapPlayers
                ? t("loots.details.draw.skippedIneligible", {
                    count: setup.ineligibleCount,
                  })
                : t("loots.details.draw.noMapPlayers")}
            </p>
          )}
          <LootDrawAddPlayerForm
            professions={item.prof}
            validate={(candidate) =>
              lootDrawAddError(loot, item, entrants, candidate)
            }
            onAdd={(candidate) =>
              update([
                ...entrants,
                {
                  ...candidate,
                  key: lootDrawPlayerKey({
                    characterId: null,
                    name: candidate.name,
                  }),
                  accountId: null,
                  characterId: null,
                  icon: null,
                  source: "MANUAL",
                  tickets: 1,
                  defaultTickets: 1,
                },
              ])
            }
          />
        </div>
      }
    />
  );
};
