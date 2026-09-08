import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  countGroupFightTeamSizes,
  isQualifyingGroupFightComposition,
  resolveGroupFightCollectionMode,
} from "@lootlog/domain/group-fights";
import { Permission } from "@lootlog/schema/permissions";
import type { CreateGroupFightResponse } from "#src/contracts/group-fights/schemas";
import { ApiDatabase } from "#src/database/drizzle/database";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/schema";
import { makeGroupFightCreation } from "#src/group-fights/group-fight-creation";
import { makeGroupFightQueries } from "#src/group-fights/group-fight-queries";
import { LootlogApi } from "../../lootlog-api.js";
import {
  RecordsAuthorization,
  RecordsDataError,
  RecordsNotFound,
  toRecordsHttpResponse,
} from "../records/records.operations.js";

const makeData = (database: typeof ApiDatabase.Service) => ({
  create: makeGroupFightCreation(database),
  ...makeGroupFightQueries(database),
  targets: (discordId: string, accountId: string, characterId: string) =>
    database
      .select({ ids: userCharactersLootlogSettingsTable.catchingGuildIds })
      .from(userCharactersLootlogSettingsTable)
      .where(
        and(
          eq(userCharactersLootlogSettingsTable.userId, discordId),
          eq(userCharactersLootlogSettingsTable.accountId, accountId),
          eq(userCharactersLootlogSettingsTable.characterId, characterId),
        ),
      )
      .orderBy(desc(userCharactersLootlogSettingsTable.createdAt))
      .limit(1)
      .pipe(Effect.map((rows) => [...new Set(rows[0]?.ids ?? [])])),
});

export class GroupFightsData extends Context.Service<
  GroupFightsData,
  ReturnType<typeof makeData>
>()("@lootlog/api/group-fights/data") {
  static readonly layerDatabase = Layer.effect(
    GroupFightsData,
    Effect.map(ApiDatabase, makeData),
  );
}

const persistence = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.mapError((cause) => new RecordsDataError({ cause })));
const readCaller = Effect.fn("group-fights.authorize")(function* (
  guildId: string,
) {
  const authorization = yield* RecordsAuthorization;
  return yield* authorization.requireGuild({
    guildId,
    capability: Permission.LOOTLOG_GROUP_FIGHTS_READ,
  });
});

export const GroupFightsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "group-fights",
  (handlers) =>
    handlers
      .handle("GroupFightsControllerCreateGroupFight", ({ payload }) =>
        toRecordsHttpResponse(
          Effect.gen(function* () {
            const authorization = yield* RecordsAuthorization;
            const caller = yield* authorization.requireCaller;
            const data = yield* GroupFightsData;
            const targets = yield* persistence(
              data.targets(
                caller.discordId,
                payload.accountId,
                payload.characterId,
              ),
            );
            const result: {
              submittedGuilds: Array<
                CreateGroupFightResponse["submittedGuilds"][number]
              >;
              rejectedGuilds: Array<
                CreateGroupFightResponse["rejectedGuilds"][number]
              >;
            } = { submittedGuilds: [], rejectedGuilds: [] };
            for (const guildId of targets) {
              const authorized = yield* authorization
                .requireGuild({
                  guildId,
                  capability: Permission.LOOTLOG_GROUP_FIGHTS_WRITE,
                })
                .pipe(
                  Effect.catchTags({
                    RecordsAccessDenied: () => Effect.succeed(null),
                    RecordsNotFound: () => Effect.succeed(null),
                  }),
                );
              if (
                !authorized ||
                !authorized.accessPolicy.allows(Permission.LOOTLOG_ACCESS)
              ) {
                result.rejectedGuilds.push({
                  guildId,
                  reason: "MISSING_MEMBER",
                });
                continue;
              }
              if (!authorized.guild.groupFightsEnabled) {
                result.rejectedGuilds.push({
                  guildId,
                  reason: "GROUP_FIGHTS_DISABLED",
                });
                continue;
              }
              if (
                !isQualifyingGroupFightComposition(
                  countGroupFightTeamSizes(payload.participants),
                  resolveGroupFightCollectionMode(
                    authorized.guild.groupFightsIncludeIncomplete,
                  ),
                )
              ) {
                result.rejectedGuilds.push({
                  guildId,
                  reason: "INCOMPLETE_TEAMS",
                });
                continue;
              }
              result.submittedGuilds.push(
                yield* persistence(
                  data.create(authorized.guild.id, caller.userId, payload),
                ),
              );
            }
            return result;
          }),
        ),
      )
      .handle(
        "GroupFightsControllerGetGuildGroupFightRanking",
        ({ params, query }) =>
          toRecordsHttpResponse(
            Effect.gen(function* () {
              const caller = yield* readCaller(params.guildId);
              const data = yield* GroupFightsData;
              return yield* persistence(
                data.ranking(caller.guild.id, caller.userId, query),
              );
            }),
          ),
      )
      .handle("GroupFightsControllerGetGuildGroupFights", ({ params, query }) =>
        toRecordsHttpResponse(
          Effect.gen(function* () {
            const caller = yield* readCaller(params.guildId);
            const data = yield* GroupFightsData;
            return yield* persistence(
              data.list(caller.guild.id, caller.userId, query),
            );
          }),
        ),
      )
      .handle("GroupFightsControllerGetGuildGroupFight", ({ params }) =>
        toRecordsHttpResponse(
          Effect.gen(function* () {
            const caller = yield* readCaller(params.guildId);
            const data = yield* GroupFightsData;
            const fightId = Number(params.fightId);
            if (!Number.isSafeInteger(fightId) || fightId <= 0)
              return yield* new RecordsNotFound({
                status: 404,
                code: "GROUP_FIGHT_NOT_FOUND",
              });
            const fight = yield* persistence(
              data.detail(caller.guild.id, caller.userId, fightId),
            );
            if (!fight)
              return yield* new RecordsNotFound({
                status: 404,
                code: "GROUP_FIGHT_NOT_FOUND",
              });
            return fight;
          }),
        ),
      ),
);
