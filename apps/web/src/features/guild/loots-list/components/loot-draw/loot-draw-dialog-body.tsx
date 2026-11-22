import { DialogHeader, DialogTitle } from "@lootlog/ui/components/dialog";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSlot } from "@/components/common/loading-slot";
import { RetryButton } from "@/components/common/retry-button";
import { CircleAlert } from "lucide-react";
import { useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { Item, Loot } from "@/lib/loots/loot-types";
import { buildLootDrawSetup } from "./build-loot-draw-entrants";
import { LootDrawEditor } from "./loot-draw-editor";
import { LootDrawHistory } from "./loot-draw-history";
import { LootDrawResult } from "./loot-draw-result";
import { useLootDraws } from "./use-loot-draws";

/**
 * The open draw dialog's header and body: the item's standing result, or the
 * editor to run one, then its voided results. It mounts only while the
 * dialog shows, so a closed dialog reads no draws.
 */
export const LootDrawDialogBody = ({
  loot,
  item,
  canVoid,
  bodyRef,
}: {
  loot: Loot;
  item: Item;
  canVoid: boolean;
  /** Takes the dialog's initial focus. */
  bodyRef: RefObject<HTMLDivElement | null>;
}) => {
  const { t } = useTranslation();
  const draws = useLootDraws(loot.id);
  const reducedMotion = usePrefersReducedMotion();
  // The draw this viewer just ran spins; any other result is shown at rest.
  const [spunDrawId, setSpunDrawId] = useState<number | null>(null);
  // While a spin runs, the body keeps the editor's height so nothing moves
  // under the wheel; once the winner shows, the dialog eases down to the result.
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const { data, isLoading, isError, isFetching, refetch } = draws.drawsQuery;
  const itemDraws = (data ?? []).filter(({ itemHid }) => itemHid === item.hid);
  const standing = itemDraws.find(({ voided }) => voided === null);
  const voided = itemDraws.filter(({ voided }) => voided !== null);
  const setup = buildLootDrawSetup(loot, item);

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <WatchableItemTile item={item} watchContext={{ world: loot.world }} />
          <DialogTitle className="line-clamp-2 px-0 pt-0 text-base">
            {t("loots.details.draw.openFor", { item: item.name })}
          </DialogTitle>
        </div>
      </DialogHeader>
      <div
        ref={bodyRef}
        tabIndex={-1}
        className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4 outline-none"
        style={{ minHeight: lockedHeight ?? 0 }}
      >
        {isLoading && (
          <div className="flex justify-center py-10">
            <LoadingSlot size="small" />
          </div>
        )}
        {isError && (
          <EmptyState
            compact
            icon={CircleAlert}
            title={t("loots.details.draw.loadError")}
            action={
              <RetryButton onRetry={() => refetch()} isRetrying={isFetching} />
            }
          />
        )}
        {data && standing && (
          <LootDrawResult
            key={standing.id}
            draw={standing}
            draws={draws}
            spin={standing.id === spunDrawId}
            canVoid={canVoid}
            onRevealed={() => setLockedHeight(null)}
          />
        )}
        {data && !standing && (
          <LootDrawEditor
            loot={loot}
            item={item}
            setup={setup}
            draws={draws}
            onSpinStart={() =>
              setLockedHeight(bodyRef.current?.offsetHeight ?? null)
            }
            onSpinFailed={() => setLockedHeight(null)}
            onDrawn={(draw) => {
              setSpunDrawId(draw.id);

              // Without motion the result shows at once, with no spin to wait for.
              if (reducedMotion) setLockedHeight(null);
            }}
          />
        )}
        <LootDrawHistory draws={voided} />
      </div>
    </>
  );
};
