import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { LOOT_CARD_INSET_CLASS } from "@/features/guild/loots-list/loots-list-layout";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { cn } from "cn";
import { PackageOpen } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { buildLootRoster, type LootRosterInput } from "./build-loot-roster";
import { LootRosterRow } from "./loot-roster-row";

export const LootPlayersSection = ({
  loot,
  onShowPlayerLoots,
}: {
  loot: LootRosterInput;
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
    <section
      aria-labelledby={titleId}
      className="@container border-b border-border"
    >
      <SectionCardHeader
        id={titleId}
        title={t("loots.details.players", { count: recipients.length })}
      />
      <ul className="divide-y divide-border/50">
        {recipients.map((player) => (
          <LootRosterRow
            key={player.key}
            player={player}
            watchContext={watchContext}
            onShowLoots={showLootsFor(player.name)}
          />
        ))}
        {unassignedItems.length > 0 && (
          <li
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-2 py-2 @xs:flex-nowrap",
              LOOT_CARD_INSET_CLASS,
            )}
          >
            <span
              aria-hidden="true"
              className="flex h-12 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
            >
              <PackageOpen className="size-4" />
            </span>
            <p className="min-w-0 flex-1 basis-32 text-sm font-medium leading-tight text-muted-foreground">
              {t("loots.list.unassignedItems")}
            </p>
            <div className="flex basis-full flex-wrap gap-1.5 @xs:ml-auto @xs:basis-auto @xs:justify-end">
              {unassignedItems.map((item, index) => (
                <WatchableItemTile
                  key={`${item.hid}:${index}`}
                  item={item}
                  watchContext={watchContext}
                />
              ))}
            </div>
          </li>
        )}
      </ul>
      {bystanders.length > 0 && (
        <>
          <h3
            className={cn(
              "border-y border-border/70 bg-muted/20 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
              LOOT_CARD_INSET_CLASS,
            )}
          >
            {t("loots.details.bystanders", { count: bystanders.length })}
          </h3>
          <ul className="divide-y divide-border/50">
            {bystanders.map((player) => (
              <LootRosterRow
                key={player.key}
                player={player}
                watchContext={watchContext}
                onShowLoots={showLootsFor(player.name)}
                muted
              />
            ))}
          </ul>
        </>
      )}
      {isSnapshotUnavailable && (
        <p
          className={cn(
            "border-t border-border/70 py-2.5 text-xs text-muted-foreground",
            LOOT_CARD_INSET_CLASS,
          )}
        >
          {t("loots.details.mapPlayersUnavailable")}
        </p>
      )}
    </section>
  );
};
