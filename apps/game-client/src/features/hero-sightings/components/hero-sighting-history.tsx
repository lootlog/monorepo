import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getHeroSightingsControllerGetHeroSightingHistoryQueryOptions } from "@lootlog/client/main";
import { AsyncContent } from "@/components/async-content";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeroSightingHistoryEntry } from "@/features/hero-sightings/components/hero-sighting-history-entry";
import type { HeroSightingRow } from "@/features/hero-sightings/hero-sighting-rows";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { getGuildNamesById } from "@/lib/api/generated-helpers";

type HeroSightingHistoryProps = {
  row: HeroSightingRow;
  now: number;
};

/**
 * The hero's latest sightings, newest first, in each Lootlog whose sighting
 * the row shows; each Lootlog's history follows its own access.
 */
export function HeroSightingHistory({ row, now }: HeroSightingHistoryProps) {
  const { t } = useTranslation("heroSightings");

  const {
    guildsQuery: { data: guilds },
  } = useLootlogGuilds();

  const guildNamesById = getGuildNamesById(guilds);
  const guildIds = [...new Set(row.sightings.map(({ guildId }) => guildId))];
  const showsGuildNames = guildIds.length > 1;

  const histories = useQueries({
    queries: guildIds.map((guildId) =>
      getHeroSightingsControllerGetHeroSightingHistoryQueryOptions(
        { guildId },
        { world: row.world, hero: row.hero.key },
      ),
    ),
  });

  return (
    <>
      <h2 className="ll:mt-0 ll:mb-1.5 ll:text-xs ll:font-semibold">
        {t("history.title", { name: row.hero.name })}
      </h2>
      <ScrollArea className="ll:max-h-64">
        {guildIds.map((guildId, index) => {
          const history = histories[index];
          const guildName = guildNamesById[guildId] ?? guildId;

          return (
            <section
              key={guildId}
              aria-label={showsGuildNames ? guildName : undefined}
            >
              {showsGuildNames ? (
                <h3 className="ll:my-1 ll:truncate ll:text-[11px] ll:font-semibold ll:text-muted-foreground">
                  {guildName}
                </h3>
              ) : null}
              <AsyncContent
                error={history?.error}
                errorLabel={t("history.loadError")}
                isLoading={history?.isPending ?? true}
                loadingLabel={t("history.loading")}
                onRetry={() => void history?.refetch()}
                retryLabel={t("actions.retry", { ns: "common" })}
              >
                {history?.data?.length === 0 ? (
                  <p className="ll:m-0 ll:text-xs ll:text-muted-foreground">
                    {t("history.empty")}
                  </p>
                ) : (
                  <ul className="ll:m-0 ll:list-none ll:p-0">
                    {history?.data?.map((sighting) => (
                      <li key={sighting.id}>
                        <HeroSightingHistoryEntry
                          sighting={sighting}
                          now={now}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </AsyncContent>
            </section>
          );
        })}
      </ScrollArea>
    </>
  );
}
