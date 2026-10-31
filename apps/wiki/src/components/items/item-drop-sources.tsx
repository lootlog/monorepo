import { Link } from "@tanstack/react-router";
import { sortBy } from "es-toolkit";
import { ChevronRight } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { NpcTypeIcon } from "@lootlog/ui/components/npc-type-icon";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";
import { NPC_TYPE_ICONS, NPC_TYPE_OPTIONS } from "@/lib/npc-types";

type ItemDropSourcesProps = {
  sources: CatalogItemDtoOutput["droppedBy"];
};

/**
 * The monsters the item drops from, each a link with its sprite, kind and
 * level. Nearly always one, so they sit in the item's header.
 */
export function ItemDropSources({ sources }: ItemDropSourcesProps) {
  return (
    <section
      aria-labelledby="item-drop-sources"
      className="flex flex-col gap-2"
    >
      <h2
        id="item-drop-sources"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {t("catalog.droppedByTitle")}
      </h2>
      {sources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          {t("catalog.noSourcesYet")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {/* Monsters that still drop the item come first. */}
          {sortBy(sources, [({ retired }) => retired]).map((npc) => {
            const type = NPC_TYPE_OPTIONS.find((option) => option === npc.type);

            return (
              <li key={npc.key}>
                <Link
                  to="/npcs/$npcSlug"
                  params={npcPageParams(npc)}
                  className={cn(
                    "group/source flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-2 pr-3 outline-none transition-[border-color,background-color] duration-200 hover:border-[color-mix(in_oklab,var(--item-rarity)_55%,var(--border))] hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    npc.retired && "opacity-70",
                  )}
                >
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-card">
                    <img
                      src={npcIconUrl(npc.icon ?? "")}
                      alt=""
                      className="max-h-12 max-w-12 object-contain [image-rendering:pixelated]"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {npc.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {type ? (
                        <span className="flex items-center gap-1.5 text-foreground/80">
                          <NpcTypeIcon
                            type={NPC_TYPE_ICONS[type]}
                            aria-hidden="true"
                            className="size-4"
                          />
                          {t(`npcTypes.${type}`)}
                        </span>
                      ) : null}
                      {npc.lvl === null ? null : (
                        <span className="tabular-nums">
                          {t("common.levelShort", { level: npc.lvl })}
                        </span>
                      )}
                      {npc.retired ? (
                        <span>{t("catalog.retiredDrop")}</span>
                      ) : null}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/source:translate-x-0.5 group-hover/source:text-foreground motion-reduce:transition-none"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
