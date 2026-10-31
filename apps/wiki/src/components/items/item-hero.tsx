import type { ReactNode } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { itemIconUrl } from "@lootlog/ui/components/item-image";
import { ITEM_RARITY_STYLES } from "@lootlog/ui/components/item-tile-details";
import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS, PROFESSION_OPTIONS } from "@/lib/item-options";
import type { UpgradeLevel } from "@/lib/item-upgrade";
import { ItemDropSources } from "./item-drop-sources";

type ItemHeroProps = {
  item: CatalogItemDtoOutput;
  upgrade: UpgradeLevel;
  /** What the User can do with the item, such as wearing it. */
  actions: ReactNode;
};

/**
 * The item's showcase: its sprite large in a rarity frame, what it is, who
 * wears it from which level, and the monster it drops from.
 */
export function ItemHero({ item, upgrade, actions }: ItemHeroProps) {
  const rarity = resolveItemRarity(item.rarity);
  const styles = ITEM_RARITY_STYLES[rarity];
  const typeLabel = item.type ? ITEM_TILE_LABELS.type[item.type] : undefined;

  const requiredProfessions = String(
    parseItemStats(item.stat).find(({ key }) => key === "reqp")?.value ?? "",
  );

  const professions = PROFESSION_OPTIONS.filter((profession) =>
    requiredProfessions.includes(profession),
  );

  return (
    <header
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--item-rarity)_35%,var(--border))] bg-card",
        styles.accent,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_20rem_at_0%_0%,color-mix(in_oklab,var(--item-rarity)_18%,transparent),transparent_70%)]"
      />
      <div className="grid gap-6 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-7 lg:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="relative size-24 shrink-0 sm:size-28">
          <div
            aria-hidden="true"
            className="absolute inset-0 rotate-45 rounded-2xl border border-[color-mix(in_oklab,var(--item-rarity)_40%,transparent)] bg-[color-mix(in_oklab,var(--item-rarity)_8%,var(--background))] shadow-[0_0_48px_-8px_color-mix(in_oklab,var(--item-rarity)_55%,transparent)]"
          />
          <img
            src={itemIconUrl(item.icon)}
            alt=""
            width={32}
            height={32}
            className="absolute inset-0 m-auto size-16 [image-rendering:pixelated] drop-shadow-[0_4px_12px_rgb(0_0_0/0.5)] sm:size-[4.5rem]"
          />
          {upgrade > 0 ? (
            <span className="absolute -right-1 -bottom-1 rounded-full border border-[color-mix(in_oklab,var(--item-rarity)_60%,var(--border))] bg-popover px-2 py-0.5 text-sm font-semibold text-foreground tabular-nums shadow-md">
              {t("upgrade.level", { level: upgrade })}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm">
              <span className={cn("font-semibold", styles.label)}>
                {ITEM_TILE_LABELS.rarity[rarity]}
              </span>
              {typeLabel ? (
                <span className="text-muted-foreground"> · {typeLabel}</span>
              ) : null}
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
              {item.name}
            </h1>
          </div>
          <dl className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-background/50 px-2.5 py-1">
              <dt className="text-muted-foreground">{t("item.level")}</dt>
              <dd className="font-semibold text-foreground tabular-nums">
                {item.lvl}
              </dd>
            </div>
            {professions.length > 0 ? (
              <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-background/50 px-2.5 py-1">
                <dt className="sr-only">{t("item.professions")}</dt>
                <dd className="text-foreground">
                  {professions
                    .map((profession) => t(`filters.professions.${profession}`))
                    .join(", ")}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="flex">{actions}</div>
        </div>

        <div className="sm:col-span-2 lg:col-span-1 lg:border-l lg:border-border/60 lg:pl-6">
          <ItemDropSources sources={item.droppedBy} />
        </div>
      </div>
    </header>
  );
}
