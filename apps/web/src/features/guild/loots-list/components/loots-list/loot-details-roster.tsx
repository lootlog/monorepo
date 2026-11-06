import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { cn } from "cn";
import { PackageOpen } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Loot } from "@/lib/loots/loot-types";
import { LootDrawButton } from "@/features/guild/loots-list/components/loot-draw/loot-draw-button";
import { buildLootRoster } from "./build-loot-roster";
import { groupIdenticalItems } from "./group-identical-items";
import { LootItemLine } from "./loot-item-line";
import { LootPlayersGrid } from "./loot-players-grid";
import { LootRecipientRow } from "./loot-recipient-row";

/** Who received what, with every item's name and identifier in its row. */
export const LootDetailsRoster = ({
  loot,
  canManageLoots,
  onShowPlayerLoots,
}: {
  loot: Loot;
  /** Managers draw items, whoever caught them. */
  canManageLoots: boolean;
  onShowPlayerLoots?: (playerName: string) => void;
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const watchContext: WatchedItemScope = { world: loot.world };

  const { recipients, unassignedItems, bystanders, isSnapshotUnavailable } =
    buildLootRoster(loot);

  const showLootsFor = (playerName: string) =>
    onShowPlayerLoots ? () => onShowPlayerLoots(playerName) : undefined;

  return (
    <section aria-labelledby={titleId} className="@container">
      <SectionCardHeader
        id={titleId}
        title={t("loots.details.players", { count: recipients.length })}
      />
      <ul className="divide-y divide-border/50 border-b border-border/50">
        {recipients
          .filter((player) => player.items.length > 0)
          .map((player) => (
            <LootRecipientRow
              key={player.key}
              player={player}
              watchContext={watchContext}
              onShowLoots={showLootsFor(player.name)}
              renderItemAction={(item) => (
                <LootDrawButton
                  loot={loot}
                  item={item}
                  canManage={canManageLoots}
                />
              )}
            />
          ))}
        {unassignedItems.length > 0 && (
          <li
            className={cn(
              "grid grid-cols-1 items-center gap-x-3 gap-y-2 py-2.5 @xs:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] @md:gap-x-4 @md:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)]",
              LIST_TILE_INSET_CLASS,
            )}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
              >
                <PackageOpen className="size-4" />
              </span>
              <p className="text-sm font-medium leading-tight text-muted-foreground">
                {t("loots.list.unassignedItems")}
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 @max-xs:pl-11">
              {groupIdenticalItems(unassignedItems).map((entry) => (
                <LootItemLine
                  key={entry.item.hid}
                  entry={entry}
                  watchContext={watchContext}
                  action={
                    <LootDrawButton
                      loot={loot}
                      item={entry.item}
                      canManage={canManageLoots}
                    />
                  }
                />
              ))}
            </div>
          </li>
        )}
      </ul>
      <LootPlayersGrid
        title={t("loots.details.playersWithoutItems", {
          count: recipients.filter((player) => player.items.length === 0)
            .length,
        })}
        players={recipients.filter((player) => player.items.length === 0)}
        watchContext={watchContext}
        showLootsFor={showLootsFor}
      />
      <LootPlayersGrid
        title={t("loots.details.bystanders", { count: bystanders.length })}
        players={bystanders}
        watchContext={watchContext}
        showLootsFor={showLootsFor}
        muted
      />
      {isSnapshotUnavailable && (
        <p
          className={cn(
            "py-2.5 text-xs text-muted-foreground",
            LIST_TILE_INSET_CLASS,
          )}
        >
          {t("loots.details.mapPlayersUnavailable")}
        </p>
      )}
    </section>
  );
};
