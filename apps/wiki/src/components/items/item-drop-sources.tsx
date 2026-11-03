import { Link } from "@tanstack/react-router";
import { sortBy } from "es-toolkit";
import { ChevronRight } from "lucide-react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";
import { NPC_TYPE_OPTIONS } from "@/lib/npc-types";

type ItemDropSourcesProps = {
  sources: CatalogItemDtoOutput["droppedBy"];
  /**
   * `header` stacks a few sources beside the item's name; `section` lays any
   * number of them out as a grid in the page body.
   */
  variant: "header" | "section";
};

/** How many sources still fit stacked beside the item's name. */
export const MAX_HEADER_DROP_SOURCES = 2;

/**
 * The monsters the item drops from, each a link with its sprite, kind and
 * level.
 */
export function ItemDropSources({ sources, variant }: ItemDropSourcesProps) {
  const isSection = variant === "section";

  return (
    <section
      aria-labelledby="item-drop-sources"
      className={cn("flex flex-col", isSection ? "@container gap-4" : "gap-2")}
    >
      <h2
        id="item-drop-sources"
        className={cn(
          "flex items-baseline gap-2",
          isSection
            ? "text-lg font-semibold tracking-tight text-foreground"
            : "text-xs font-medium tracking-wide text-muted-foreground uppercase",
        )}
      >
        {t("catalog.droppedByTitle")}
        {sources.length > 1 ? (
          <span
            className={cn(
              "font-normal text-muted-foreground tabular-nums",
              isSection && "text-sm",
            )}
          >
            {sources.length}
          </span>
        ) : null}
      </h2>
      {sources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          {t("catalog.noSourcesYet")}
        </p>
      ) : (
        <ul
          className={cn(
            "grid gap-2",
            isSection && "@xl:grid-cols-2 @5xl:grid-cols-3",
          )}
        >
          {/* Monsters that still drop the item come first. */}
          {sortBy(sources, [({ retired }) => retired]).map((npc) => {
            const type = NPC_TYPE_OPTIONS.find((option) => option === npc.type);

            return (
              <li key={npc.key}>
                <Link
                  to="/npcs/$npcSlug"
                  params={npcPageParams(npc)}
                  className={cn(
                    "group/source flex items-center gap-3 rounded-xl border border-border/70 p-2 pr-3 outline-none transition-[border-color,background-color] duration-200 hover:border-[color-mix(in_oklab,var(--item-rarity)_55%,var(--border))] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    isSection
                      ? "bg-card hover:bg-accent/40"
                      : "bg-background/60 hover:bg-background/80",
                    npc.retired && "opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60",
                      isSection ? "bg-background/60" : "bg-card",
                    )}
                  >
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
                        <span className="text-foreground/80">
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
