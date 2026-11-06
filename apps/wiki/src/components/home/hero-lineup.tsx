import { Link } from "@tanstack/react-router";
import { uniqBy } from "es-toolkit";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { useNewBosses } from "@/hooks/use-new-bosses";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";
import { npcSummary } from "@/lib/npc-summary";

const BOSSES_SHOWN = 3;

/** The newest bosses side by side, each opening its page. */
export function HeroLineup() {
  const { bosses } = useNewBosses();

  return (
    <section
      aria-labelledby="hero-lineup"
      className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-4"
    >
      <h2
        id="hero-lineup"
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {t("home.lineupTitle")}
      </h2>
      <ul className="grid grid-cols-3 gap-3">
        {bosses
          ? // A boss fought as a hero and a colossus shows once.
            uniqBy(bosses, ({ monster }) => monster.name)
              .slice(0, BOSSES_SHOWN)
              .map(({ monster }) => (
                <li key={monster.key} className="min-w-0">
                  <Link
                    to="/npcs/$npcSlug"
                    params={npcPageParams(monster)}
                    className="group/boss flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <NpcPortrait
                      icon={monster.icon}
                      size="lg"
                      className="h-36 transition-[border-color] duration-150 group-hover/boss:border-primary/50 motion-reduce:transition-none"
                    />
                    <span className="flex min-w-0 flex-col px-0.5">
                      <span className="truncate text-sm font-semibold text-foreground group-hover/boss:underline">
                        {monster.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {npcSummary(monster)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))
          : Array.from({ length: BOSSES_SHOWN }, (_, index) => (
              <li key={index} className="flex flex-col gap-2">
                <Skeleton className="h-36 rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </li>
            ))}
      </ul>
    </section>
  );
}
