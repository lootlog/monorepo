import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import {
  memberTable,
  memberToRoleTable,
  npcKillStatsTable,
  userCharactersLootlogSettingsTable,
  userGameAccountSettingsTable,
  userGuildTimerSettingsTable,
  userKillStatsTable,
  userPinnedEventTable,
  userSettingDocumentTable,
  userSettingsTable,
  userSoundSettingsTable,
  userTimerSettingsTable,
} from "../database/drizzle/schema.js";
import { MEMBER_LAST_DISCORD_STATUS } from "../members/constants/member-discord-status.constant.js";

type UserSettingsWrite = {
  readonly guildsOrder?: string[];
  readonly hiddenGuildIds?: string[];
  readonly theme?: string;
};

export class UsersRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findUserSettings(userId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, userId))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async findGameAccountSettings(userId: string, accountId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(userGameAccountSettingsTable)
        .where(
          and(
            eq(userGameAccountSettingsTable.userId, userId),
            eq(userGameAccountSettingsTable.accountId, accountId),
          ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async findAppearanceDocument(userId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(userSettingDocumentTable)
        .where(
          and(
            eq(userSettingDocumentTable.userId, userId),
            eq(userSettingDocumentTable.domain, "appearance"),
            eq(userSettingDocumentTable.scopeType, "USER"),
            eq(userSettingDocumentTable.scopeId, userId),
          ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async upsertUserSettings(userId: string, values: UserSettingsWrite) {
    const now = new Date();
    const rows = await this.run((database) =>
      database
        .insert(userSettingsTable)
        .values({
          userId,
          guildsOrder: values.guildsOrder ?? [],
          hiddenGuildIds: values.hiddenGuildIds ?? [],
          theme: values.theme ?? "default",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userSettingsTable.userId,
          set: { ...values, updatedAt: now },
        })
        .returning(),
    );
    return rows[0] ?? null;
  }

  upsertGameAccountSettings(
    userId: string,
    accountId: string,
    settings: unknown,
  ) {
    const now = new Date();
    return this.run((database) =>
      database
        .insert(userGameAccountSettingsTable)
        .values({ userId, accountId, settings, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [
            userGameAccountSettingsTable.userId,
            userGameAccountSettingsTable.accountId,
          ],
          set: { settings, updatedAt: now },
        }),
    );
  }

  upsertAppearanceDocument(userId: string, overrides: unknown) {
    const now = new Date();
    return this.run((database) =>
      database
        .insert(userSettingDocumentTable)
        .values({
          userId,
          domain: "appearance",
          scopeType: "USER",
          scopeId: userId,
          overrides,
          schemaVersion: 1,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            userSettingDocumentTable.userId,
            userSettingDocumentTable.domain,
            userSettingDocumentTable.scopeType,
            userSettingDocumentTable.scopeId,
          ],
          set: { overrides, schemaVersion: 1, updatedAt: now },
        }),
    );
  }

  deleteAccount(authUserId: string, discordId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const members = yield* transaction
              .select({
                id: memberTable.id,
                guildId: memberTable.guildId,
                globalUserId: memberTable.globalUserId,
                userId: memberTable.userId,
              })
              .from(memberTable)
              .where(eq(memberTable.userId, discordId));
            const memberIds = members.map(({ id }) => id);

            if (memberIds.length > 0) {
              yield* transaction
                .delete(npcKillStatsTable)
                .where(inArray(npcKillStatsTable.memberId, memberIds));
            }
            yield* transaction
              .delete(userKillStatsTable)
              .where(eq(userKillStatsTable.userId, discordId));
            yield* transaction
              .delete(userCharactersLootlogSettingsTable)
              .where(eq(userCharactersLootlogSettingsTable.userId, discordId));
            yield* transaction
              .delete(userSettingsTable)
              .where(eq(userSettingsTable.userId, authUserId));
            yield* transaction
              .delete(userSettingDocumentTable)
              .where(eq(userSettingDocumentTable.userId, authUserId));
            yield* transaction
              .delete(userGameAccountSettingsTable)
              .where(eq(userGameAccountSettingsTable.userId, authUserId));
            yield* transaction
              .delete(userTimerSettingsTable)
              .where(eq(userTimerSettingsTable.userId, authUserId));
            yield* transaction
              .delete(userSoundSettingsTable)
              .where(eq(userSoundSettingsTable.userId, authUserId));
            yield* transaction
              .delete(userGuildTimerSettingsTable)
              .where(eq(userGuildTimerSettingsTable.userId, authUserId));
            yield* transaction
              .delete(userPinnedEventTable)
              .where(eq(userPinnedEventTable.userId, authUserId));

            for (const member of members) {
              yield* transaction
                .delete(memberToRoleTable)
                .where(eq(memberToRoleTable.A, member.id));
              yield* transaction
                .update(memberTable)
                .set({
                  active: false,
                  lastDiscordAttemptAt: new Date(),
                  lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.ACCOUNT_DELETED,
                  updatedAt: new Date(),
                })
                .where(eq(memberTable.id, member.id));
            }

            return members.map((member) => ({
              discordId: member.userId,
              guildId: member.guildId,
              globalUserId: member.globalUserId,
            }));
          }),
        ),
      ),
    );
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }
}
