import { createFileRoute } from "@tanstack/react-router";
import {
  useCatalogControllerGetItems,
  useCatalogControllerGetNpcs,
} from "@lootlog/client/search";
import { NpcTile } from "@lootlog/ui/components/npc-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { t } from "@/i18n/messages";
import { formatFirstSeenOn } from "@/lib/item-options";

const DROPS_LIMIT = 96;

export const Route = createFileRoute("/npcs_/$npcKey")({
  component: NpcRoute,
  head: () => ({
    meta: [{ title: `${t("meta.npcTitle")} | ${t("meta.title")}` }],
  }),
});

function NpcRoute() {
  const { npcKey } = Route.useParams();

  const npcQuery = useCatalogControllerGetNpcs({ keys: [npcKey], limit: 1 });

  const dropsQuery = useCatalogControllerGetItems({
    droppedBy: npcKey,
    sort: "newest",
    limit: DROPS_LIMIT,
  });

  const npc = npcQuery.data?.hits[0];

  return (
    <div className="flex flex-col gap-6 py-6">
      {npcQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : npcQuery.data && !npc ? (
        <p className="text-sm text-muted-foreground">
          {t("catalog.npcNotFound")}
        </p>
      ) : (
        <>
          <header className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-5">
            {npc ? (
              <NpcTile
                npc={npc}
                levelLabel={(level) => t("common.levelShort", { level })}
              />
            ) : (
              <Skeleton className="h-10 w-8 rounded-md" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              {npc ? (
                <>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                    {npc.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t(`npcTypes.${npc.type}`)} ·{" "}
                    {t("common.levelShort", { level: npc.lvl })}
                    {npc.firstSeenOn
                      ? ` · ${t("catalog.firstSeenOn", { day: formatFirstSeenOn(npc.firstSeenOn) })}`
                      : null}
                  </p>
                </>
              ) : (
                <>
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-64" />
                </>
              )}
            </div>
          </header>

          <section aria-labelledby="npc-drops" className="flex flex-col gap-4">
            <h2
              id="npc-drops"
              className="text-base font-semibold text-foreground"
            >
              {t("catalog.dropsTitle")}
            </h2>
            <CatalogItemGrid
              items={dropsQuery.data?.hits}
              isError={dropsQuery.isError}
              placeholders={8}
              emptyLabel={t("catalog.noDropsYet")}
              showSource={false}
            />
          </section>
        </>
      )}
    </div>
  );
}
