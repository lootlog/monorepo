import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { isElasticLootDrawItem } from "@lootlog/domain/loot-draw";
import { getShortnameByProf } from "@lootlog/domain/profession";
import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSlot } from "@/components/common/loading-slot";
import { RetryButton } from "@/components/common/retry-button";
import { CircleAlert, Dices } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Item, Loot } from "@/lib/loots/loot-types";
import { buildLootDrawSetup } from "./build-loot-draw-entrants";
import { LootDrawEditor } from "./loot-draw-editor";
import { LootDrawHistory } from "./loot-draw-history";
import { LootDrawResult } from "./loot-draw-result";
import { useLootDraws } from "./use-loot-draws";

/** The draw of one item: its standing result, or the editor to run one. */
export const LootDrawDialog = ({
  loot,
  item,
  canManage,
  open,
  onOpenChange,
}: {
  loot: Loot;
  item: Item;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useTranslation();
  const draws = useLootDraws(loot.id);
  // The draw this viewer just ran spins; any other result is shown at rest.
  const [spunDrawId, setSpunDrawId] = useState<number | null>(null);
  const { data, isLoading, isError, isFetching, refetch } = draws.drawsQuery;
  const itemDraws = (data ?? []).filter(({ itemHid }) => itemHid === item.hid);
  const standing = itemDraws.find(({ voided }) => voided === null);
  const voided = itemDraws.filter(({ voided }) => voided !== null);
  const setup = buildLootDrawSetup(loot, item);
  const winner = setup?.entrants[0];

  const professions = item.prof
    .map((profession) =>
      t(`professions.${getShortnameByProf(profession) ?? profession}`),
    )
    .join(", ");

  const isElastic = isElasticLootDrawItem(item);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,46rem)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
          <div className="flex min-w-0 items-center gap-3">
            <WatchableItemTile
              item={item}
              watchContext={{ world: loot.world }}
            />
            <div className="min-w-0">
              <DialogTitle className="line-clamp-2 text-base">
                {t("loots.details.draw.openFor", { item: item.name })}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isElastic
                  ? t("loots.details.draw.requirementsElastic", { professions })
                  : t("loots.details.draw.requirements", {
                      professions,
                      level: item.lvl,
                    })}
              </p>
            </div>
          </div>
          {winner && (
            <DialogDescription className="mt-2 text-xs">
              {t("loots.details.draw.description", { winner: winner.name })}
            </DialogDescription>
          )}
        </DialogHeader>
        {/* A fixed height keeps the dialog still when a spin swaps the editor for the result. */}
        <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4">
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
                <RetryButton
                  onRetry={() => refetch()}
                  isRetrying={isFetching}
                />
              }
            />
          )}
          {data && standing && (
            <LootDrawResult
              key={standing.id}
              draw={standing}
              draws={draws}
              spin={standing.id === spunDrawId}
              canManage={canManage}
            />
          )}
          {data && !standing && canManage && setup && (
            <LootDrawEditor
              loot={loot}
              item={item}
              setup={setup}
              draws={draws}
              onDrawn={(draw) => setSpunDrawId(draw.id)}
            />
          )}
          {data && !standing && !canManage && (
            <EmptyState
              compact
              icon={Dices}
              title={t("loots.details.draw.notDrawn")}
            />
          )}
          <LootDrawHistory draws={voided} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
