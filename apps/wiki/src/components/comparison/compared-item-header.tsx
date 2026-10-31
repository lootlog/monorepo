import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { UpgradeSelect } from "@/components/common/upgrade-select";
import { EquipButton } from "@/components/equipment/equip-button";
import { useItemComparison } from "@/contexts/item-comparison-context";
import { t } from "@/i18n/messages";
import { itemPageParams } from "@/lib/catalog-links";
import { isUpgradable, type ItemUpgrade } from "@/lib/item-upgrade";

type ComparedItemHeaderProps = {
  /** The item as dropped; its column shows it at `upgrade`. */
  item: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
};

/**
 * One compared item at the head of its column: its tile and page, the
 * upgrade it is compared at, and ways to wear it or take it out.
 */
export function ComparedItemHeader({ item, upgrade }: ComparedItemHeaderProps) {
  const { remove, setUpgrade } = useItemComparison();
  const rarity = resolveItemRarity(item.rarity);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CatalogItemTile item={item} />
        <div className="flex gap-1">
          <EquipButton item={item} upgrade={upgrade} compact />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("comparison.remove", { name: item.name })}
            title={t("comparison.remove", { name: item.name })}
            onClick={() => remove(item.id)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          to="/items/$itemSlug"
          params={itemPageParams(item)}
          title={item.name}
          className={cn(
            "line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere] outline-none hover:underline focus-visible:underline",
            LOOT_RARITY_TEXT_CLASS[rarity],
          )}
        >
          {item.name}
        </Link>
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {t("common.levelShort", { level: item.lvl })}
        </span>
      </div>
      {isUpgradable(item) ? (
        <UpgradeSelect
          compact
          label={t("comparison.upgradeOf", { name: item.name })}
          value={upgrade.level}
          onChange={(level) =>
            setUpgrade(item.id, level === upgrade.level ? upgrade : { level })
          }
        />
      ) : null}
    </div>
  );
}
