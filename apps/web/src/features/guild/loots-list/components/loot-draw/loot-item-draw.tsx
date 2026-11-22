import { cn } from "cn";
import { Dices, Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useCanManageLoots } from "@/features/guild/loots-list/use-can-manage-loots";
import type { Item, Loot } from "@/lib/loots/loot-types";
import { LootDrawDialog } from "./loot-draw-dialog";
import { useLootDrawRules } from "./use-loot-draw-rules";

/**
 * A drawable item's tile on the loot list, with its draw at hand: a trophy
 * and the standing winner under the tile, or a die that opens the wheel. The
 * badge takes the bottom-left corner; a stack's count holds the bottom-right.
 * An item the Organization does not draw shows only its tile, unless its
 * draw is open: voiding an excluded item's result keeps the dialog on screen.
 */
export const LootItemDraw = ({
  loot,
  item,
  children,
}: {
  loot: Loot;
  item: Item;
  /** The item's tile. */
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const canVoid = useCanManageLoots();
  const { canDraw, showsDraw } = useLootDrawRules();

  const winner = loot.standingDraws.find(
    ({ itemHid }) => itemHid === item.hid,
  )?.winner;

  const openDraw = () => setOpen(true);

  if (!open && !showsDraw(loot, item)) return children;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={openDraw}
          aria-label={
            winner
              ? t("loots.details.draw.wonByItem", {
                  item: item.name,
                  name: winner.name,
                })
              : t("loots.details.draw.openFor", { item: item.name })
          }
          title={
            winner
              ? t("loots.details.draw.wonBy", { name: winner.name })
              : t("loots.details.draw.spin")
          }
          className={cn(
            "absolute -bottom-1.5 -left-1.5 z-10 flex size-5 items-center justify-center rounded-full shadow-sm ring-2 ring-card transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            // A 28px target around the 20px badge.
            "after:absolute after:-inset-1 after:content-['']",
            winner
              ? "bg-primary text-primary-foreground hover:bg-primary/85"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          {winner ? (
            <Trophy aria-hidden="true" className="size-3" />
          ) : (
            <Dices aria-hidden="true" className="size-3" />
          )}
        </button>
      </div>
      {winner && (
        // The name hangs under the tile without widening the player's
        // column, so a long name never spreads the players apart.
        <div className="relative h-5 w-full">
          <button
            type="button"
            onClick={openDraw}
            // The trophy above takes keyboard focus for the same action.
            tabIndex={-1}
            aria-label={t("loots.details.draw.wonByItem", {
              item: item.name,
              name: winner.name,
            })}
            title={t("loots.details.draw.wonBy", { name: winner.name })}
            className="absolute left-1/2 top-1.5 max-w-16 -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold leading-4 text-primary transition-colors hover:bg-primary/25"
          >
            {winner.name}
          </button>
        </div>
      )}
      <LootDrawDialog
        loot={loot}
        item={item}
        canVoid={canVoid}
        canDraw={canDraw(loot, item)}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
};
