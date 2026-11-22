import { eq, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { isOrganizationIdLike } from "@lootlog/domain/organization-vanity-url";

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
