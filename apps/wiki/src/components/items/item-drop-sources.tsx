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
import { npcSummary } from "@/lib/npc-summary";

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
                <Link
                  to="/npcs/$npcSlug"
                  params={npcPageParams(npc)}
                  className={cn(
                    "group/source flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-3 outline-none transition-[border-color,background-color] duration-150 hover:border-[color-mix(in_oklab,var(--item-rarity,var(--primary))_55%,var(--border))] hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    npc.retired && "opacity-70",
                  )}
                >
                  <NpcPortrait icon={npc.icon} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {npc.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {npcSummary(npc)}
                    </span>
                    {npc.retired ? (
                      <span className="text-xs text-muted-foreground">
                        {t("catalog.retiredDrop")}
                      </span>
                    ) : npc.dropRate ? (
                      <ItemDropRate rate={npc.dropRate} npcType={npc.type} />
                    ) : null}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-150 group-hover/source:translate-x-0.5 group-hover/source:text-foreground motion-reduce:transition-none"
                  />
                </Link>
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
