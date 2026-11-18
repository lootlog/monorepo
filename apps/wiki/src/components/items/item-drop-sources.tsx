import { Link } from "@tanstack/react-router";
import { sortBy } from "es-toolkit";
import { ChevronRight } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { cn } from "cn";
import { ArticleSection } from "@/components/article/article-section";
import { DropRateMethod } from "@/components/catalog/drop-rate-method";
import { ItemDropRate } from "@/components/catalog/item-drop-rate";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";
import { NpcKindLevel } from "@/components/npcs/npc-kind-level";

/**
 * The monsters the item drops from, each a link with its sprite, kind and
 * level, and how often a boss's kills drop it; those that no longer drop it
 * come last.
 */
export function ItemDropSources({
  sources,
}: {
  sources: CatalogItemDtoOutput["droppedBy"];
}) {
  return (
    <ArticleSection
      id="item-drop-sources"
      title={t("catalog.droppedByTitle")}
      count={sources.length > 1 ? sources.length : undefined}
    >
      {sources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          {t("catalog.noSourcesYet")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(17rem,100%),1fr))] gap-2">
            {sortBy(sources, [({ retired }) => retired]).map((npc) => (
              <li key={npc.key}>
                <div
                  className={cn(
                    "group/source relative flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-3 transition-[border-color,background-color] duration-150 hover:border-[color-mix(in_oklab,var(--item-rarity,var(--primary))_55%,var(--border))] hover:bg-accent/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring motion-reduce:transition-none",
                    npc.retired && "opacity-70",
                  )}
                >
                  <NpcPortrait icon={npc.icon} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {/* The link covers the card; the drop rate's button sits above it. */}
                    <Link
                      to="/npcs/$npcSlug"
                      params={npcPageParams(npc)}
                      className="truncate text-sm font-semibold text-foreground outline-none after:absolute after:inset-0 after:rounded-xl"
                    >
                      {npc.name}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      <NpcKindLevel npc={npc} />
                    </span>
                    {npc.retired ? (
                      <span className="text-xs text-muted-foreground">
                        {t("catalog.retiredDrop")}
                      </span>
                    ) : npc.dropRate ? (
                      <span className="relative z-10 w-fit max-w-full">
                        <ItemDropRate rate={npc.dropRate} npcType={npc.type} />
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-150 group-hover/source:translate-x-0.5 group-hover/source:text-foreground motion-reduce:transition-none"
                  />
                </div>
              </li>
            ))}
          </ul>
          {sources.some(({ dropRate }) => dropRate !== null) ? (
            <DropRateMethod />
          ) : null}
        </div>
      )}
    </ArticleSection>
  );
}
