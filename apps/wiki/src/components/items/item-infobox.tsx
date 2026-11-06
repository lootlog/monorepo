import { Link } from "@tanstack/react-router";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { itemEventSlug } from "@lootlog/domain/item-events";
import { itemIconUrl } from "@lootlog/ui/components/item-image";
import {
  ITEM_RARITY_STYLES,
  ItemTileDetails,
} from "@lootlog/ui/components/item-tile-details";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { Infobox } from "@/components/article/infobox";
import { InfoboxRow } from "@/components/article/infobox-row";
import { InfoboxSection } from "@/components/article/infobox-section";
import { t } from "@/i18n/messages";
import { itemEvents } from "@/lib/item-events";
import { findRequiredProfessions, ITEM_TILE_LABELS } from "@/lib/item-options";
import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import type { ReactNode } from "react";

type ItemInfoboxProps = {
  /** The item as the page shows it, at its level for the set's character. */
  item: CatalogItemDtoOutput;
  /** Its stats at the upgrade the page shows. */
  stat: string;
  upgradeLevel: number;
  renderStat: (displayValue: ItemDisplayValue) => ReactNode;
};

/**
 * The item's fact box: its icon large in its rarity's frame, what it is,
 * who wears it from which level, its events, and its in-game tooltip.
 */
export function ItemInfobox({
  item,
  stat,
  upgradeLevel,
  renderStat,
}: ItemInfoboxProps) {
  const rarity = resolveItemRarity(item.rarity);
  const styles = ITEM_RARITY_STYLES[rarity];
  const typeLabel = item.type ? ITEM_TILE_LABELS.type[item.type] : undefined;
  const professions = findRequiredProfessions(item.stat);
  const events = itemEvents(item.stat);

  return (
    <Infobox
      title={item.name}
      subtitle={
        <>
          <span className={cn("font-semibold", styles.label)}>
            {ITEM_TILE_LABELS.rarity[rarity]}
          </span>
          {typeLabel ? ` · ${typeLabel}` : null}
        </>
      }
      className="[--infobox-accent:var(--item-rarity)]"
      media={
        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg border border-[color-mix(in_oklab,var(--item-rarity)_30%,var(--border))] bg-[radial-gradient(60%_60%_at_50%_50%,color-mix(in_oklab,var(--item-rarity)_22%,var(--background)),var(--background))]">
          <img
            src={itemIconUrl(item.icon)}
            alt={item.name}
            width={96}
            height={96}
            className="size-24 [image-rendering:pixelated] drop-shadow-[0_6px_16px_rgb(0_0_0/0.55)]"
          />
          {upgradeLevel > 0 ? (
            <span className="absolute top-2 right-2 rounded-md border border-[color-mix(in_oklab,var(--item-rarity)_60%,var(--border))] bg-popover px-2 py-0.5 text-sm font-semibold text-emerald-400 tabular-nums">
              {t("upgrade.level", { level: upgradeLevel })}
            </span>
          ) : null}
        </div>
      }
    >
      <InfoboxSection title={t("item.factsTitle")}>
        <InfoboxRow label={t("item.rarity")}>
          <span className={styles.label}>
            {ITEM_TILE_LABELS.rarity[rarity]}
          </span>
        </InfoboxRow>
        {typeLabel ? (
          <InfoboxRow label={t("item.type")}>{typeLabel}</InfoboxRow>
        ) : null}
        <InfoboxRow label={t("item.level")}>
          {item.lvl > 0 ? (
            <span className="tabular-nums">{item.lvl}</span>
          ) : (
            <span className="text-muted-foreground">{t("item.noLevel")}</span>
          )}
        </InfoboxRow>
        <InfoboxRow label={t("item.professions")}>
          {professions.length > 0
            ? professions
                .map((profession) => t(`filters.professions.${profession}`))
                .join(", ")
            : t("item.anyProfession")}
        </InfoboxRow>
        {events.length > 0 ? (
          <InfoboxRow label={t("item.events")}>
            <ul className="flex flex-col gap-0.5">
              {events.map((event) => (
                <li key={event}>
                  <Link
                    to="/events/$eventSlug"
                    params={{ eventSlug: itemEventSlug(event) }}
                    className="text-primary outline-none hover:underline focus-visible:underline"
                  >
                    {event}
                  </Link>
                </li>
              ))}
            </ul>
          </InfoboxRow>
        ) : null}
      </InfoboxSection>
      <InfoboxSection title={t("item.inGame")}>
        <div className="px-3 pt-1 pb-2">
          <div className="overflow-hidden rounded-lg border border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] bg-popover">
            <ItemTileDetails
              color=""
              icon={item.icon}
              labels={ITEM_TILE_LABELS}
              name={item.name}
              rarity={rarity}
              renderStat={renderStat}
              stat={stat}
              type={item.type ?? ""}
            />
          </div>
        </div>
      </InfoboxSection>
    </Infobox>
  );
}
