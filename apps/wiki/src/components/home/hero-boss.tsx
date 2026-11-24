import { Link } from "@tanstack/react-router";
import { sortBy } from "es-toolkit";
import { useState } from "react";
import { itemRarityRank } from "@lootlog/domain/item-rarity";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { EmberSparks } from "@lootlog/ui/components/ember-sparks";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { NpcKindLevel } from "@/components/npcs/npc-kind-level";
import { useNewBosses } from "@/hooks/use-new-bosses";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";
import { BossPicker } from "./boss-picker";
import { PixelSprite } from "./pixel-sprite";

const BOSSES_SHOWN = 6;

const DROPS_SHOWN = 10;

export function HeroBoss() {
  const { bosses, isError } = useNewBosses();
  const [pickedKey, setPickedKey] = useState<string>();

  if (isError) {
    return (
      <p role="alert" className="text-center text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!bosses) {
    return (
      <div aria-busy="true" className="flex flex-col items-center gap-6">
        <Skeleton className="h-56 w-48 rounded-2xl md:h-80" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  const shown = bosses.slice(0, BOSSES_SHOWN);

  const featured =
    shown.find(({ monster }) => monster.key === pickedKey) ?? shown[0];

  if (!featured) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t("home.bossesEmpty")}
      </p>
    );
  }

  const { monster, items } = featured;

  return (
    <div className="flex flex-col items-center gap-7">
      <Link
        to="/npcs/$npcSlug"
        params={npcPageParams(monster)}
        className="group/boss flex flex-col items-center gap-6 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          key={monster.key}
          className="relative isolate flex h-56 items-end animate-rise-in md:h-80"
        >
          <span className="motion-safe:animate-sprite-float">
            {monster.icon ? (
              <PixelSprite
                src={npcIconUrl(monster.icon)}
                className="[zoom:2] md:[zoom:3]"
              />
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-2 left-1/2 -z-10 h-4 w-[70%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-md motion-safe:animate-sprite-shadow"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-[-15%] bottom-0 isolate h-32"
          >
            <EmberSparks seed={monster.id} />
          </span>
        </span>
        <span className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm text-muted-foreground">
            {t("home.latestBoss")} · <NpcKindLevel npc={monster} />
          </span>
          <span className="text-2xl font-semibold tracking-[-0.02em] text-foreground group-hover/boss:underline md:text-3xl">
            {monster.name}
          </span>
        </span>
      </Link>

      <TooltipProvider delay={100}>
        <ul
          key={monster.key}
          aria-label={t("home.bossDrops", { name: monster.name })}
          className="flex max-w-md flex-wrap justify-center gap-2 animate-rise-in"
        >
          {sortBy(items, [({ rarity }) => itemRarityRank(rarity)])
            .slice(0, DROPS_SHOWN)
            .map((item) => (
              <li key={item.id}>
                <CatalogItemTile item={item} />
              </li>
            ))}
        </ul>
      </TooltipProvider>

      <BossPicker
        bosses={shown.map((boss) => boss.monster)}
        pickedKey={monster.key}
        onPick={setPickedKey}
      />
    </div>
  );
}
