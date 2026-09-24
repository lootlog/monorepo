import { eq, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";
import { isOrganizationIdLike } from "@lootlog/domain/organization-vanity-url";

/**
 * Picks the Organization a path segment refers to. The id owner always wins,
 * and an id-like segment never falls back to a vanity URL, so one
 * Organization's vanity URL cannot shadow another Organization's id.
 */
export const pickGuildByIdOrVanityUrl = <
  Guild extends { readonly id: string; readonly vanityUrl: string | null },
>(
  guilds: ReadonlyArray<Guild>,
  idOrVanityUrl: string,
): Guild | undefined =>
  guilds.find(({ id }) => id === idOrVanityUrl) ??
  (isOrganizationIdLike(idOrVanityUrl)
    ? undefined
    : guilds.find(({ vanityUrl }) => vanityUrl === idOrVanityUrl));

/**
 * Resolves an active Organization from its id or vanity URL. The `active`
 * filter runs after precedence: an inactive id owner resolves to nothing
 * rather than handing its id to another Organization's vanity URL.
 */
export const findActiveGuild = (
  database: ApiDatabaseValue,
  idOrVanityUrl: string,
) =>
  database
    .select()
    .from(guildTable)
    .where(
      isOrganizationIdLike(idOrVanityUrl)
        ? eq(guildTable.id, idOrVanityUrl)
        : or(
            eq(guildTable.id, idOrVanityUrl),
            eq(guildTable.vanityUrl, idOrVanityUrl),
          ),
    )
    .limit(2)
    .pipe(
      Effect.map((guilds) => {
        const guild = pickGuildByIdOrVanityUrl(guilds, idOrVanityUrl);

        return guild?.active ? guild : null;
      }),
    );
