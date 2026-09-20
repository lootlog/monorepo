import type { Loot } from "@/lib/loots/loot-types";
import { Button } from "@lootlog/ui/components/button";
import { ChevronDown, Copy } from "lucide-react";
import { useId, useState, type FC } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { toast } from "sonner";
import { cn } from "cn";
import { formatItemHid } from "@/lib/utils/hid-detection";
import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import { useTranslation } from "react-i18next";
import { LOOT_CARD_INSET_CLASS } from "@/features/guild/loots-list/loots-list-layout";
import { buildLootItemOwnerMap } from "@/features/guild/loots-list/utils/build-loot-share-maps";

export type LootItemIdsProps = {
  loot: Loot;
};

/** Item identifiers for pasting into the search; collapsed because the
 * roster above already shows who received what. */
export const LootItemIds: FC<LootItemIdsProps> = ({ loot }) => {
  const [open, setOpen] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const { t } = useTranslation();
  const titleId = useId();
  const ownerMap = buildLootItemOwnerMap(loot.lootShare);

  const watchContext = {
    world: loot.world,
  };

  const handleCopyId = (id: string) => {
    if (copyingId !== null) return;
    setCopyingId(id);

    return Promise.resolve()
      .then(() => navigator.clipboard.writeText(id))
      .then(() => toast.success(t("loots.details.copySuccess")))
      .catch(() => toast.error(t("loots.details.copyError")))
      .finally(() => setCopyingId(null));
  };

  const getOwnerName = (itemHid: string) => {
    const ownerId = ownerMap[itemHid];

    return ownerId
      ? loot.players.find((player) => player.id === ownerId)?.name
      : undefined;
  };

  return (
    <section aria-labelledby={titleId} className="border-b border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                LOOT_CARD_INSET_CLASS,
              )}
            >
              <h2 id={titleId} className="text-base font-semibold">
                {t("loots.details.itemIds", { count: loot.items.length })}
              </h2>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
            </button>
          }
        />
        <CollapsibleContent>
          <ul className="divide-y divide-border/50 border-t border-border/50">
            {loot.items.map((item, index) => {
              const owner = getOwnerName(item.hid);
              const formattedItemHid = formatItemHid(item.hid, loot.world);

              return (
                <li
                  key={`${item.hid}:${index}`}
                  className={cn(
                    "flex items-center gap-3 py-2.5",
                    LOOT_CARD_INSET_CLASS,
                  )}
                >
                  <WatchableItemTile item={item} watchContext={watchContext} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="min-w-0 break-words text-sm font-medium leading-tight text-foreground">
                        {item.name}
                      </span>
                      {owner && (
                        <span className="text-xs text-muted-foreground">
                          {t("loots.list.obtainedBy")}{" "}
                          <span className="font-medium text-foreground/80">
                            {owner}
                          </span>
                        </span>
                      )}
                    </div>
                    {/* The whole identifier stays visible on narrow screens; one click selects it. */}
                    <code className="select-all break-all font-mono text-[11px] leading-snug text-muted-foreground">
                      {formattedItemHid}
                    </code>
                  </div>
                  <Button
                    size="icon"
                    className="size-8 shrink-0"
                    variant="ghost"
                    onClick={() => handleCopyId(formattedItemHid)}
                    loading={copyingId === formattedItemHid}
                    disabled={copyingId !== null}
                    aria-label={t("loots.details.copyId")}
                    title={t("loots.details.copyId")}
                  >
                    <Copy className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};
