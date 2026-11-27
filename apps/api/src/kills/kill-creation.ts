import { adapterOperation } from "@lootlog/instrumentation/operation";
import { selectCharacterCatchingGuildIds } from "#src/members/character-catching-guilds";
import {
  ForwardAuthIdentity,
  requestApiKeyAccess,
} from "#src/runtime/auth/forward-auth-identity";
import {
  selectAccessibleGuilds,
  selectActiveGuildMembers,
} from "#src/members/member-access-query";
import { Clock, Effect, Option } from "effect";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import { getNpcType, isDropSourceBossType } from "@lootlog/domain/npc-type";
import { getKillLootRolls } from "@lootlog/domain/loot-rolls";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Capability } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import type { RedisService } from "#src/redis/redis.service";
import { getKillNpcId } from "@lootlog/domain/npc-identity";
import type { CreateKillRequest } from "#src/contracts/kills/schemas";
import {
  buildBossKillDedupKey,
  buildGuildKillDedupKey,
  buildMemberKillDedupKey,
  buildUserKillDedupKey,
} from "./kill-dedup-key.js";
import { getKillStatsBucketStart } from "./kill-stats-period.js";
import {
  incrementGuild,
  incrementMember,
  incrementUser,
  type KillInput,
  type KillWrite,
  recordBossKill,
} from "./kill-creation.writes.js";

const DEDUP_TTL_SECONDS = 30;

export interface KillCreationCache {
  readonly invalidateScopes: RedisService["invalidateScopes"];
  readonly deleteIfValue: RedisService["deleteIfValue"];
  readonly setNx: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, unknown>;
  readonly setNxGet: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<string | null, unknown>;
}

export interface MemberKillFollowUp {
  readonly enqueue: (
    kill: KillInput & { readonly guildId: string; readonly memberId: number },
  ) => KillWrite;
  readonly committed: Effect.Effect<void>;
}

export const makeKillCreation = (
  database: typeof ApiDatabase.Service,
  cache: KillCreationCache,
  publishActivity: (
    input: KillInput & { readonly guildId: string },
  ) => Effect.Effect<void> = () => Effect.void,
  publishPersonalStatsChanged: (userId: string) => Effect.Effect<void> = () =>
    Effect.void,
  memberKillFollowUp: MemberKillFollowUp = {
    enqueue: () => () => [],
    committed: Effect.void,
  },
) => {
  const protect = adapterOperation("kills.drizzle");

  const invalidate = (scope: string) =>
    cache.invalidateScopes(scope).pipe(
      Effect.catch((error) =>
        Effect.logWarning("Failed to invalidate kill stats cache", {
          error,
          scope,
        }),
      ),
    );

  interface Claim {
    readonly key: string;
    readonly token: string;
  }

  const claim = Effect.fnUntraced(function* (key: string, operation: string) {
    const token = crypto.randomUUID();

    const acquired = yield* protect(
      operation,
      cache.setNx(key, token, DEDUP_TTL_SECONDS),
    );

    return acquired ? ({ key, token } satisfies Claim) : null;
  });

  const release = ({ key, token }: Claim) =>
    cache.deleteIfValue(key, token).pipe(
      Effect.catch((error) =>
        Effect.logWarning("Failed to release kill dedup claim", {
          error,
          key,
        }),
      ),
    );

  return Effect.fn("KillsController_createKill")(function* (
    discordId: string,
    data: CreateKillRequest,
  ) {
    const npcType = getNpcType(NpcType, {
      wt: data.npc.wt,
      prof: data.npc.prof,
      icon: data.npc.icon,
      isHeroFromEvent: data.npc.isHeroFromEvent,
    });

    const npcId = getKillNpcId(data.npc, npcType);
    const killedAt = new Date(yield* Clock.currentTimeMillis);
    const periodStart = getKillStatsBucketStart(killedAt);

    const input: KillInput = {
      userId: discordId,
      world: data.world,
      npcId,
      npcName: data.npc.name,
      npcType,
      npcLvl: data.npc.lvl,
      npcProf: data.npc.prof ?? null,
      npcIcon:
        data.npc.icon === undefined ? null : normalizeNpcIcon(data.npc.icon),
      lastKilledAt: killedAt,
      lootRolls: data.party
        ? getKillLootRolls({ npcType, world: data.world, party: data.party })
        : null,
    };

    const apiKey = yield* requestApiKeyAccess;

    const claims: Claim[] = [];

    const track = (acquired: Claim | null) => {
      if (acquired) claims.push(acquired);

      return acquired;
    };

    const releaseAll = Effect.forEach(claims, release, {
      concurrency: "unbounded",
      discard: true,
    });

    const writeKill = Effect.gen(function* () {
      const claimPersonal =
        !apiKey || apiKey.personalData
          ? claim(
              buildUserKillDedupKey(discordId, { world: data.world, npcId }),
              "kills.dedup.user",
            ).pipe(Effect.map(track))
          : Effect.succeed(null);

      const readTargets = Effect.gen(function* () {
        const [catchingGuildIds, writableGuildRows] = yield* protect(
          "kills.create.scope",
          Effect.all(
            [
              selectCharacterCatchingGuildIds(database, discordId, data),
              selectAccessibleGuilds(database, discordId, [
                Capability.LOOTLOG_LOOTS_WRITE,
              ]).pipe(
                Effect.map((rows) =>
                  rows.map(({ guild }) => ({ id: guild.id })),
                ),
              ),
            ],
            { concurrency: "unbounded" },
          ),
        );

        const writableGuildIds = new Set(writableGuildRows.map(({ id }) => id));

        const guildIds = catchingGuildIds.filter((guildId) =>
          writableGuildIds.has(guildId),
        );

        if (guildIds.length === 0) return { guildIds, members: [] };

        const members = yield* protect(
          "kills.create.members",
          selectActiveGuildMembers(database, discordId, guildIds),
        );

        return { guildIds, members };
      });

      const [personalResult, targetsResult] = yield* Effect.all(
        [claimPersonal, readTargets],
        { concurrency: "unbounded", mode: "result" },
      );

      const personalClaim = yield* Effect.fromResult(personalResult);
      const { guildIds, members } = yield* Effect.fromResult(targetsResult);

      const memberByGuild = new Map(
        members.map((member) => [member.guildId, member]),
      );

      const claimGuilds = Effect.forEach(
        guildIds,
        (guildId) => {
          const member = memberByGuild.get(guildId);

          if (!member) return Effect.succeed(null);
          const killKey = { world: data.world, npcId };

          return Effect.gen(function* () {
            const memberClaim = track(
              yield* claim(
                buildMemberKillDedupKey(guildId, member.id, killKey),
                "kills.dedup.member",
              ),
            );

            if (!memberClaim) return null;

            const guildClaim = yield* claim(
              buildGuildKillDedupKey(guildId, killKey),
              "kills.dedup.guild",
            ).pipe(
              Effect.map(track),
              Effect.catch((error) =>
                Effect.logError({
                  message: `Failed to claim guild kill for guildId ${guildId}`,
                  error,
                }).pipe(Effect.as(null)),
              ),
            );

            return {
              guildId,
              memberId: member.id,
              countsGuild: guildClaim !== null,
            };
          }).pipe(
            Effect.catch((error) =>
              Effect.logError({
                message: `Failed to claim kill stats for guildId ${guildId}`,
                error,
              }).pipe(Effect.as(null)),
            ),
          );
        },
        { concurrency: "unbounded" },
      );

      const targets = (yield* claimGuilds)
        .filter((target) => target !== null)
        .toSorted((a, b) => a.guildId.localeCompare(b.guildId));

      if (!personalClaim && targets.length === 0)
        return { deduplicated: true, updated: 0 };

      const bossKilledAt =
        isDropSourceBossType(npcType) && targets.some((t) => t.countsGuild)
          ? yield* cache
              .setNxGet(
                buildBossKillDedupKey({ world: data.world, npcId }),
                killedAt.toISOString(),
                DEDUP_TTL_SECONDS,
              )
              .pipe(
                Effect.map((first) =>
                  first === null ? killedAt : new Date(first),
                ),
                Effect.catch((error) =>
                  Effect.logWarning("Failed to claim boss kill", {
                    error,
                  }).pipe(Effect.as(null)),
                ),
              )
          : null;

      const writes: KillWrite[] = [
        ...(personalClaim
          ? [
              incrementUser(
                input,
                {
                  characterId: data.characterId,
                  name: data.character?.name ?? null,
                  level: data.character?.lvl ?? null,
                  profession: data.character?.prof ?? null,
                  icon: data.character?.icon ?? null,
                },
                periodStart,
              ),
            ]
          : []),
        ...targets.flatMap(({ guildId, memberId, countsGuild }) => [
          incrementMember({ ...input, guildId, memberId }, periodStart),
          ...(countsGuild
            ? [incrementGuild({ ...input, guildId }, periodStart)]
            : []),
        ]),
        ...targets.map(({ guildId, memberId }) =>
          memberKillFollowUp.enqueue({ ...input, guildId, memberId }),
        ),
        ...(bossKilledAt
          ? targets
              .filter(({ countsGuild }) => countsGuild)
              .map(({ guildId }) =>
                recordBossKill({ ...input, guildId }, bossKilledAt),
              )
          : []),
      ];

      const committed = yield* protect(
        "kills.create.write",
        database.transaction((transaction) =>
          Effect.all(
            writes.flatMap((write) => write(transaction)),
            { discard: true },
          ),
        ),
      ).pipe(
        Effect.as(true),
        Effect.catch((error) =>
          Effect.logError({
            message: "Failed to upsert kill stats",
            error,
          }).pipe(Effect.andThen(releaseAll), Effect.as(false)),
        ),
      );

      if (!committed) return { updated: 0 };

      if (personalClaim) {
        yield* invalidate(`kill-stats:user:${discordId}`);
        const identity = yield* Effect.serviceOption(ForwardAuthIdentity);

        if (Option.isSome(identity))
          yield* publishPersonalStatsChanged(identity.value.userId).pipe(
            Effect.forkDetach,
          );
      }

      yield* Effect.forEach(
        targets,
        ({ guildId }) => invalidate(`kill-stats:guild:${guildId}`),
        { concurrency: "unbounded", discard: true },
      );
      yield* Effect.forEach(
        targets.filter(({ countsGuild }) => countsGuild),
        ({ guildId }) =>
          publishActivity({ ...input, guildId }).pipe(Effect.forkDetach),
        { discard: true },
      );
      yield* memberKillFollowUp.committed;

      return { updated: targets.length };
    });

    return yield* writeKill.pipe(Effect.onError(() => releaseAll));
  });
};
