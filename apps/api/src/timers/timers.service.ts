import { createHash, randomUUID } from "node:crypto";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import {
  NpcType,
  Permission,
  Prisma,
  TimerHistoryAction,
  type Member,
  type PlayerSnapshot,
  type Timer,
  type Guild,
  type Role,
} from "src/generated/prisma/client";
import { getNpcRoutingTier, getNpcTypeByWt } from "@lootlog/types";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { getProfByShortname } from "src/shared/utils/get-prof-by-shortname";
import { ErrorKey } from "src/timers/enum/error-key.enum";
import { GuildsService } from "src/guilds/guilds.service";
import type { GetTimersDto } from "src/timers/dto/get-timers.dto";
import type { ResetTimerDto } from "src/timers/dto/reset-timer.dto";
import { DEFAULT_RESPAWN_RANDOMNESS } from "src/timers/constants/respawn";
import type { CreateManualTimerDto } from "src/timers/dto/create-manual-timer.dto";
import { generateUniqueIntId } from "src/shared/utils/generate-unique-int-id";
import { RoutingKey } from "src/enum/routing-key.enum";
import {
  buildNpcJsonVisibilitySqlCondition,
  buildNpcJsonVisibilityWhere,
  canActOnStrategicNpc,
  canViewStrategicNpc,
  createStrategicAccessContext,
  TIMER_VISIBILITY_PERMISSIONS,
} from "src/shared/permissions/strategic-access-policy";
import type { NpcAccessContext } from "@lootlog/api-helpers/permissions";
import type { CreateTimerFromGameClientDto } from "src/timers/dto/create-timer-from-game-client.dto";
import { validateAndCalculateSpawnTimes } from "src/timers/utils/validate-spawn-times";
import { TIMER_LIMITS, TIMER_TYPES } from "src/timers/constants/timer-limits";
import { RedisService } from "@lootlog/nest-shared/redis";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { ExecutionError } from "redlock";
import { getSyntheticNpcId } from "src/events/utils/get-synthetic-npc-id";
import { RedlockService } from "src/lib/redlock/redlock.service";
import {
  buildTimerKey,
  isLegacyNpcIdIdentifier,
} from "src/timers/utils/timer-key";
import { EventTimerHooksService } from "src/events/services/event-timer-hooks.service";
import { UserLootlogConfigService } from "src/user-lootlog-config/user-lootlog-config.service";
import { MemberResponseDto } from "src/shared/dto/member-response.dto";
import type {
  CreateAutoTimerRejectedGuild,
  CreateAutoTimerRejectedGuildReason,
  CreateAutoTimerResponse,
  CreateAutoTimerSubmittedGuild,
} from "src/timers/dto/create-auto-timer-response.dto";

function parseNpc(npc: unknown): { lvl: number; type: NpcType } | null {
  if (!npc) return null;
  if (typeof npc === "string") {
    return JSON.parse(npc);
  }
  return npc as { lvl: number; type: NpcType };
}

function extractNpcName(npc: unknown): string {
  if (npc && typeof npc === "object" && !Array.isArray(npc)) {
    const name = (npc as Record<string, unknown>).name;
    return typeof name === "string" ? name : "";
  }
  return "";
}

const DEDUP_TTL_SECONDS = 30;
const DEDUP_WAIT_ATTEMPTS = 100;
const DEDUP_WAIT_DELAY_MS = 50;
const CACHE_TTL_SECONDS = 2;
const NPC_TYPE_VALUES = new Set<string>(Object.values(NpcType));
const TIMER_HISTORY_ENTRY_LIMIT = 5;
const RELEASE_DEDUP_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

type TimerMember = Member & {
  roles?: Role[];
};

type TimerWithOptionalMember = Timer & {
  member?: TimerMember | null;
  actorCharacter?: PlayerSnapshot | null;
};

export interface EventHeroTimerLookup {
  guildId: string;
  world: string;
  npcId: number | null;
  npcName: string;
}

export interface EventHeroTimerLookupResult {
  guildId: string;
  npcId: number;
  timerKey: string;
  world: string;
  minSpawnTime: Date;
  maxSpawnTime: Date;
  npc: unknown;
}

type TimerActorCharacterInput = {
  accountId: string;
  characterId: string;
  name: string;
  prof?: string;
  icon?: string;
  lvl?: number;
};

type CreateTimerHistoryEntryInput = {
  guildId: string;
  world: string;
  timerKey: string;
  npcId: number;
  npc: Prisma.InputJsonValue;
  action: TimerHistoryAction;
  actorMemberId?: number;
  actorMemberUserId?: string;
  actorCharacterSnapshotId?: number | null;
  actorCharacterLvl?: number | null;
  minSpawnTime?: Date | null;
  maxSpawnTime?: Date | null;
  latestRespBaseSeconds?: number | null;
  latestRespawnRandomness?: number | null;
  wasReset?: boolean | null;
  windowOpenedAt?: Date | null;
  timerCreatedById?: number | null;
  timerActorCharacterSnapshotId?: number | null;
  timerActorCharacterLvl?: number | null;
};

type TimerHistoryEntryWithRelations = {
  id: number;
  guildId: string;
  world: string;
  timerKey: string;
  npcId: number;
  npc: unknown;
  action: TimerHistoryAction;
  actorCharacterLvl: number | null;
  minSpawnTime: Date | null;
  maxSpawnTime: Date | null;
  latestRespBaseSeconds: number | null;
  latestRespawnRandomness: number | null;
  wasReset: boolean | null;
  windowOpenedAt: Date | null;
  timerCreatedById: number | null;
  timerActorCharacterSnapshotId: number | null;
  timerActorCharacterLvl: number | null;
  createdAt: Date;
  guild: Pick<Guild, "name">;
  actorMember: TimerMember;
  actorCharacter?: PlayerSnapshot | null;
  timerCreatedBy?: TimerMember | null;
  timerActorCharacter?: PlayerSnapshot | null;
};

interface NpcData {
  [key: string]: string | number;
  id: number;
  name: string;
  prof: string;
  location: string;
  wt: string;
  lvl: number;
  type: string;
  icon: string;
  margonemType: string;
}

interface EventRespawnTimerInput {
  guildId: string;
  world: string;
  npcId: number;
  npcName: string;
  npcIcon: string | null;
  minSpawnTime: Date;
  maxSpawnTime: Date;
  createdById: number;
  isUsingSyntheticId: boolean;
}

interface EventTimerLookupInput {
  guildId: string;
  world: string;
  npcId: number;
  npcName: string;
}

type CreateAutoTimerOutcome = {
  submittedGuilds: CreateAutoTimerSubmittedGuild[];
  rejectedGuilds: CreateAutoTimerRejectedGuild[];
};

type CreateTimerForGuildContext = {
  discordId: string;
  guildId: string;
  data: CreateTimerFromGameClientDto;
  now: Date;
  timerKey: string;
  dedupKey: string;
  lockKey: string;
};

@Injectable()
export class TimersService implements OnModuleInit {
  private redlock: ReturnType<RedlockService["createInstance"]>;
  private readonly lockTtl = 30000;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
    private readonly redis: RedisService,
    private readonly eventTimerHooks: EventTimerHooksService,
    private readonly redlockService: RedlockService,
  ) {}

  onModuleInit() {
    this.redlock = this.redlockService.createInstance({
      automaticExtensionThreshold: 5000,
    });
  }

  private getLockKey(world: string, timerKey: string, guildId: string): string {
    return `timer:lock:${guildId}:${world}:${timerKey}`;
  }

  private getDedupKey(
    timerKey: string,
    world: string,
    guildId: string,
  ): string {
    return `timer:dedup:${guildId}:${world}:${timerKey}`;
  }

  private getTimersCacheKey(
    guildId: string,
    userId: string,
    world?: string,
  ): string {
    return `timer:list:${guildId}:${userId}:${world || "all"}`;
  }

  private createAutoTimerRejectedGuild(
    guild: Pick<Guild, "id" | "name">,
    reason: CreateAutoTimerRejectedGuildReason,
  ): CreateAutoTimerRejectedGuild {
    return {
      guildId: guild.id,
      guildName: guild.name,
      reason,
    };
  }

  private createAutoTimerResponse(
    outcome: CreateAutoTimerOutcome,
  ): CreateAutoTimerResponse {
    return {
      submittedGuilds: outcome.submittedGuilds,
      rejectedGuilds: outcome.rejectedGuilds,
    };
  }

  private throwCreateAutoTimerBadRequest(
    message: ErrorKey,
    rejectedGuilds: CreateAutoTimerRejectedGuild[],
  ): never {
    throw new BadRequestException({
      message,
      submittedGuilds: [],
      rejectedGuilds,
    });
  }

  private async invalidateTimersCache(guildId: string): Promise<void> {
    const count = await this.redis.deleteByPattern(`timer:list:${guildId}:*`);
    if (count > 0) {
      this.logger.log({
        level: "debug",
        message: `Invalidated ${count} cache entries for guild ${guildId}`,
      });
    }
  }

  private buildNpcData(npc: {
    id: number;
    name: string;
    prof?: string;
    location: string;
    wt: number;
    lvl: number;
    type: number;
    icon: string;
  }): NpcData {
    return {
      id: npc.id,
      name: npc.name,
      prof: getProfByShortname(npc.prof ?? ""),
      location: npc.location,
      wt: String(npc.wt),
      lvl: npc.lvl,
      type: getNpcTypeByWt(NpcType, npc.wt, npc.prof ?? "", npc.type),
      icon: npc.icon,
      margonemType: String(npc.type),
    };
  }

  private toDate(value: Date | string | null | undefined) {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value : new Date(value);
  }

  private mapTimerMember(member: TimerMember | null | undefined) {
    if (!member) {
      return undefined;
    }

    return {
      id: member.id,
      userId: member.userId,
      guildId: member.guildId,
      type: member.type,
      name: member.name,
      avatar: member.avatar,
      banner: member.banner,
      active: member.active,
      roles: member.roles ?? [],
      globalUserId: member.globalUserId,
      lastDiscordSyncAt: this.toDate(member.lastDiscordSyncAt),
      updatedAt: this.toDate(member.updatedAt) ?? new Date(),
    } satisfies typeof MemberResponseDto.schema._output;
  }

  private generatePlayerSnapshotHash(name: string, prof: string, icon: string) {
    return createHash("sha256").update(`${name}${prof}${icon}`).digest("hex");
  }

  private normalizeCharacterAndAccount(characterId: string, accountId: string) {
    const normalizedCharacterId = Number.parseInt(characterId, 10);
    const normalizedAccountId = Number.parseInt(accountId, 10);

    if (
      Number.isNaN(normalizedCharacterId) ||
      Number.isNaN(normalizedAccountId)
    ) {
      return null;
    }

    return {
      characterId: normalizedCharacterId,
      accountId: normalizedAccountId,
    };
  }

  private async upsertPlayerSnapshot(
    world: string,
    actorCharacter: TimerActorCharacterInput | undefined,
  ) {
    if (!actorCharacter) {
      return null;
    }

    const ids = this.normalizeCharacterAndAccount(
      actorCharacter.characterId,
      actorCharacter.accountId,
    );

    if (!ids) {
      return null;
    }

    const prof = getProfByShortname(actorCharacter.prof ?? "");
    const icon = actorCharacter.icon ?? "";
    const snapshotHash = this.generatePlayerSnapshotHash(
      actorCharacter.name,
      actorCharacter.prof ?? "",
      icon,
    );

    return this.prisma.playerSnapshot.upsert({
      where: {
        world_accountId_characterId_snapshotHash: {
          world,
          accountId: ids.accountId,
          characterId: ids.characterId,
          snapshotHash,
        },
      },
      create: {
        world,
        accountId: ids.accountId,
        characterId: ids.characterId,
        snapshotHash,
        name: actorCharacter.name,
        prof,
        icon,
      },
      update: {},
    });
  }

  private mapTimerActorCharacter(
    actorCharacter: PlayerSnapshot | null | undefined,
    lvl: number | null | undefined,
  ) {
    if (!actorCharacter) {
      return undefined;
    }

    return {
      name: actorCharacter.name,
      prof: actorCharacter.prof,
      icon: actorCharacter.icon,
      lvl: lvl ?? null,
      characterId: actorCharacter.characterId,
      accountId: actorCharacter.accountId,
    };
  }

  private mapTimerNpc(npc: unknown) {
    if (!npc || typeof npc !== "object" || Array.isArray(npc)) {
      return null;
    }

    const timerNpc = npc as Record<string, unknown>;
    const rawType =
      typeof timerNpc.type === "string" ? timerNpc.type.toUpperCase() : null;
    const normalizedType =
      rawType && NPC_TYPE_VALUES.has(rawType)
        ? (rawType as NpcType)
        : NpcType.NPC;

    return {
      id: typeof timerNpc.id === "number" ? timerNpc.id : 0,
      name: typeof timerNpc.name === "string" ? timerNpc.name : "",
      prof: typeof timerNpc.prof === "string" ? timerNpc.prof : "",
      location: typeof timerNpc.location === "string" ? timerNpc.location : "",
      wt:
        typeof timerNpc.wt === "string"
          ? timerNpc.wt
          : String(timerNpc.wt ?? ""),
      lvl: typeof timerNpc.lvl === "number" ? timerNpc.lvl : 0,
      type: normalizedType,
      icon: typeof timerNpc.icon === "string" ? timerNpc.icon : null,
      margonemType:
        typeof timerNpc.margonemType === "string"
          ? timerNpc.margonemType
          : String(timerNpc.margonemType ?? ""),
    };
  }

  private mapTimerResponse(timer: TimerWithOptionalMember) {
    return {
      guildId: timer.guildId,
      npcId: timer.npcId,
      timerKey: timer.timerKey,
      world: timer.world,
      minSpawnTime: this.toDate(timer.minSpawnTime) ?? new Date(),
      maxSpawnTime: this.toDate(timer.maxSpawnTime) ?? new Date(),
      npc: this.mapTimerNpc(timer.npc),
      wasReset: timer.wasReset,
      member: this.mapTimerMember(timer.member),
      actorCharacter: this.mapTimerActorCharacter(
        timer.actorCharacter,
        timer.actorCharacterLvl,
      ),
      deletedAt: this.toDate(timer.deletedAt),
      updatedAt: this.toDate(timer.updatedAt) ?? new Date(),
    };
  }

  private mapTimerHistoryResponse(entry: TimerHistoryEntryWithRelations) {
    return {
      id: entry.id,
      guildId: entry.guildId,
      guildName: entry.guild.name,
      world: entry.world,
      timerKey: entry.timerKey,
      npcId: entry.npcId,
      npc: this.mapTimerNpc(entry.npc),
      action: entry.action,
      member: this.mapTimerMember(entry.actorMember),
      actorCharacter: this.mapTimerActorCharacter(
        entry.actorCharacter,
        entry.actorCharacterLvl,
      ),
      minSpawnTime: this.toDate(entry.minSpawnTime),
      maxSpawnTime: this.toDate(entry.maxSpawnTime),
      canRestore: entry.action === TimerHistoryAction.DELETE,
      createdAt: this.toDate(entry.createdAt) ?? new Date(),
    };
  }

  private createTimerHistoryEntry(data: CreateTimerHistoryEntryInput) {
    const actorMember = data.actorMemberId
      ? { connect: { id: data.actorMemberId } }
      : {
          connect: {
            memberId: {
              userId: data.actorMemberUserId ?? "",
              guildId: data.guildId,
            },
          },
        };

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.timerHistoryEntry.create({
        data: {
          guild: { connect: { id: data.guildId } },
          world: data.world,
          timerKey: data.timerKey,
          npcId: data.npcId,
          npc: data.npc,
          action: data.action,
          actorMember,
          actorCharacter: data.actorCharacterSnapshotId
            ? { connect: { id: data.actorCharacterSnapshotId } }
            : undefined,
          actorCharacterLvl: data.actorCharacterLvl ?? null,
          minSpawnTime: data.minSpawnTime ?? null,
          maxSpawnTime: data.maxSpawnTime ?? null,
          latestRespBaseSeconds: data.latestRespBaseSeconds ?? null,
          latestRespawnRandomness: data.latestRespawnRandomness ?? null,
          wasReset: data.wasReset ?? null,
          windowOpenedAt: data.windowOpenedAt ?? null,
          timerCreatedBy: data.timerCreatedById
            ? { connect: { id: data.timerCreatedById } }
            : undefined,
          timerActorCharacter: data.timerActorCharacterSnapshotId
            ? { connect: { id: data.timerActorCharacterSnapshotId } }
            : undefined,
          timerActorCharacterLvl: data.timerActorCharacterLvl ?? null,
        },
      });

      const staleEntries = await tx.timerHistoryEntry.findMany({
        where: {
          guildId: data.guildId,
          world: data.world,
          timerKey: data.timerKey,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: TIMER_HISTORY_ENTRY_LIMIT,
        select: { id: true },
      });

      if (staleEntries.length > 0) {
        await tx.timerHistoryEntry.deleteMany({
          where: {
            id: { in: staleEntries.map((staleEntry) => staleEntry.id) },
          },
        });
      }

      return entry;
    });
  }

  private isManualTimerNpc(npc: unknown) {
    const timerNpc = npc as { margonemType?: number | string } | null;

    return Number(timerNpc?.margonemType) === TIMER_TYPES.CUSTOM_MANUAL;
  }

  private createTimerHistoryEntryIfNotManual(
    data: CreateTimerHistoryEntryInput,
  ) {
    if (this.isManualTimerNpc(data.npc)) {
      return null;
    }

    return this.createTimerHistoryEntry(data);
  }

  private getAlwaysVisibleTimerKeys(
    settings: Prisma.JsonValue | null | undefined,
    world: string,
  ): string[] {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return [];
    }

    const settingsByWorld = settings as Record<string, unknown>;
    const worldSettings = settingsByWorld[world];
    if (!Array.isArray(worldSettings)) return [];

    return worldSettings.filter(
      (timerKey): timerKey is string => typeof timerKey === "string",
    );
  }

  private async getAlwaysVisibleExpiredTimerKeys(
    userId: string,
    world: string,
  ): Promise<string[]> {
    const settings = await this.prisma.userSettingDocument.findUnique({
      where: {
        userId_domain_scopeType_scopeId: {
          userId,
          domain: "timers",
          scopeType: "USER",
          scopeId: userId,
        },
      },
      select: { overrides: true },
    });
    const overrides =
      settings?.overrides &&
      typeof settings.overrides === "object" &&
      !Array.isArray(settings.overrides)
        ? settings.overrides
        : undefined;

    return this.getAlwaysVisibleTimerKeys(
      overrides?.alwaysVisibleExpiredTimers,
      world,
    );
  }

  private getTimersWhere(
    guildId: string | string[],
    world: string,
    alwaysVisibleExpiredTimerKeys: string[],
    now: Date,
  ): Prisma.TimerWhereInput {
    const guildWhere =
      typeof guildId === "string" ? { guildId } : { guildId: { in: guildId } };

    if (alwaysVisibleExpiredTimerKeys.length === 0) {
      return {
        ...guildWhere,
        deletedAt: null,
        maxSpawnTime: { gt: now },
        world,
      };
    }

    return {
      ...guildWhere,
      world,
      OR: [
        {
          deletedAt: null,
          maxSpawnTime: { gt: now },
        },
        {
          timerKey: { in: alwaysVisibleExpiredTimerKeys },
          maxSpawnTime: { lte: now },
          NOT: [
            {
              npc: {
                path: ["margonemType"],
                equals: TIMER_TYPES.CUSTOM_MANUAL,
              },
            },
            {
              npc: {
                path: ["margonemType"],
                equals: String(TIMER_TYPES.CUSTOM_MANUAL),
              },
            },
          ],
        },
        {
          timerKey: { in: alwaysVisibleExpiredTimerKeys },
          deletedAt: { not: null },
          NOT: [
            {
              npc: {
                path: ["margonemType"],
                equals: TIMER_TYPES.CUSTOM_MANUAL,
              },
            },
            {
              npc: {
                path: ["margonemType"],
                equals: String(TIMER_TYPES.CUSTOM_MANUAL),
              },
            },
          ],
        },
      ],
    };
  }

  private getHistorySnapshotFromTimer(timer: TimerWithOptionalMember) {
    return {
      latestRespBaseSeconds: timer.latestRespBaseSeconds,
      latestRespawnRandomness: timer.latestRespawnRandomness,
      wasReset: timer.wasReset,
      windowOpenedAt: timer.windowOpenedAt,
      timerCreatedById: timer.createdById,
      timerActorCharacterSnapshotId: timer.actorCharacterSnapshotId,
      timerActorCharacterLvl: timer.actorCharacterLvl,
    };
  }

  private getTimerDeleteRouting(npc: unknown): {
    tier: "base" | "titans" | "heroes";
    npcLevel?: number;
  } {
    const timerNpc = npc as {
      lvl?: number;
      prof?: string;
      type?: number | string;
      wt?: number | string;
    };

    return {
      tier: getNpcRoutingTier(timerNpc),
      npcLevel: timerNpc.lvl,
    };
  }

  private async findPreviousTimerForKillContext(
    guildId: string,
    world: string,
    timerKey: string,
    npcId: number,
    npcName: string,
    npcData: NpcData,
  ): Promise<{
    previousTimer: Timer | null;
    migratedSyntheticNpcId: number | null;
    migratedSyntheticTimerKey: string | null;
  }> {
    const previousTimer = await this.prisma.timer.findUnique({
      where: { timerId: { guildId, world, timerKey } },
    });
    if (previousTimer) {
      return {
        previousTimer,
        migratedSyntheticNpcId: null,
        migratedSyntheticTimerKey: null,
      };
    }

    try {
      const heroMatch = await this.eventTimerHooks.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );
      if (!heroMatch || heroMatch.eventHero.npcId !== null) {
        return {
          previousTimer: null,
          migratedSyntheticNpcId: null,
          migratedSyntheticTimerKey: null,
        };
      }

      const syntheticNpcId = getSyntheticNpcId(heroMatch.eventHero.id);
      if (syntheticNpcId === npcId) {
        return {
          previousTimer: null,
          migratedSyntheticNpcId: null,
          migratedSyntheticTimerKey: null,
        };
      }

      const syntheticTimerKey = buildTimerKey(syntheticNpcId, npcName);
      const syntheticTimer = await this.prisma.timer.findUnique({
        where: { timerId: { guildId, world, timerKey: syntheticTimerKey } },
      });
      if (!syntheticTimer) {
        return {
          previousTimer: null,
          migratedSyntheticNpcId: null,
          migratedSyntheticTimerKey: null,
        };
      }

      const migratedTimer = await this.prisma.timer.upsert({
        where: { timerId: { guildId, world, timerKey } },
        create: {
          createdById: syntheticTimer.createdById,
          guildId,
          npcId,
          timerKey,
          world,
          minSpawnTime: syntheticTimer.minSpawnTime,
          maxSpawnTime: syntheticTimer.maxSpawnTime,
          latestRespBaseSeconds: syntheticTimer.latestRespBaseSeconds,
          latestRespawnRandomness: syntheticTimer.latestRespawnRandomness,
          tempId: syntheticTimer.tempId,
          wasReset: syntheticTimer.wasReset,
          npc: npcData,
          windowOpenedAt: syntheticTimer.windowOpenedAt,
          deletedAt: null,
        },
        update: {},
      });

      try {
        await this.prisma.timer.delete({
          where: {
            timerId: { guildId, world, timerKey: syntheticTimer.timerKey },
          },
        });
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          )
        ) {
          throw error;
        }
      }

      this.logger.log({
        level: "debug",
        message: "Migrated synthetic event timer to real NPC ID",
        guildId,
        world,
        syntheticNpcId,
        realNpcId: npcId,
      });

      return {
        previousTimer: migratedTimer,
        migratedSyntheticNpcId: syntheticNpcId,
        migratedSyntheticTimerKey: syntheticTimer.timerKey,
      };
    } catch (error) {
      this.logger.warn({
        message: "Failed to resolve synthetic timer context for event hero",
        guildId,
        world,
        npcId,
        npcName,
        error: error instanceof Error ? error.message : error,
      });
      return {
        previousTimer: null,
        migratedSyntheticNpcId: null,
        migratedSyntheticTimerKey: null,
      };
    }
  }

  private findTimerAfterLockFailure(
    guildId: string,
    world: string,
    timerKey: string,
  ) {
    const maxAttempts = 10;

    const tryFindTimer = async (
      attempt: number,
    ): Promise<Awaited<
      ReturnType<typeof this.prisma.timer.findUnique>
    > | null> => {
      const timer = await this.prisma.timer.findUnique({
        where: { timerId: { guildId, world, timerKey } },
        include: { member: true, actorCharacter: true },
      });

      if (timer) {
        return timer;
      }

      if (attempt >= maxAttempts - 1) {
        return null;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
      return tryFindTimer(attempt + 1);
    };

    return tryFindTimer(0);
  }

  private async findTimerByIdentifier(
    guildId: string,
    world: string,
    identifier: string,
  ) {
    if (isLegacyNpcIdIdentifier(identifier)) {
      const timers = await this.prisma.timer.findMany({
        where: {
          guildId,
          world,
          npcId: Number.parseInt(identifier, 10),
        },
        include: { member: true, actorCharacter: true },
      });

      if (timers.length === 1) {
        return timers[0];
      }

      if (timers.length > 1) {
        throw new BadRequestException({
          message: ErrorKey.AMBIGUOUS_TIMER_IDENTIFIER,
        });
      }

      return null;
    }

    return this.prisma.timer.findUnique({
      where: { timerId: { guildId, world, timerKey: identifier } },
      include: { member: true, actorCharacter: true },
    });
  }

  getTimerByIdentifier(guildId: string, world: string, identifier: string) {
    return this.findTimerByIdentifier(guildId, world, identifier);
  }

  getEventRespawnTimer({
    guildId,
    world,
    npcId,
    npcName,
  }: EventTimerLookupInput) {
    return this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId,
          world,
          timerKey: buildTimerKey(npcId, npcName),
        },
      },
      include: { member: true, actorCharacter: true },
    });
  }

  async openEventRespawnTimer({
    guildId,
    world,
    npcId,
    npcName,
    npcIcon,
    minSpawnTime,
    maxSpawnTime,
    createdById,
    isUsingSyntheticId,
  }: EventRespawnTimerInput) {
    const timerKey = buildTimerKey(npcId, npcName);
    const lockKey = this.getLockKey(world, timerKey, guildId);
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const windowOpenedAt = new Date();
      const timer = await this.prisma.timer.upsert({
        where: {
          timerId: {
            guildId,
            world,
            timerKey,
          },
        },
        create: {
          guildId,
          createdById,
          world,
          npcId,
          timerKey,
          minSpawnTime,
          maxSpawnTime,
          latestRespBaseSeconds: Math.round(
            (maxSpawnTime.getTime() - minSpawnTime.getTime()) / 2000,
          ),
          latestRespawnRandomness: DEFAULT_RESPAWN_RANDOMNESS,
          wasReset: false,
          npc: {
            id: npcId,
            name: npcName,
            prof: "",
            location: "",
            wt: "",
            lvl: 0,
            type: "hero",
            icon: npcIcon ?? "",
            margonemType: isUsingSyntheticId
              ? String(TIMER_TYPES.CUSTOM_MANUAL)
              : "0",
          },
          windowOpenedAt,
          deletedAt: null,
        },
        update: {
          minSpawnTime,
          maxSpawnTime,
          wasReset: false,
          npc: {
            id: npcId,
            name: npcName,
            prof: "",
            location: "",
            wt: "",
            lvl: 0,
            type: "hero",
            icon: npcIcon ?? "",
            margonemType: isUsingSyntheticId
              ? String(TIMER_TYPES.CUSTOM_MANUAL)
              : "0",
          },
          windowOpenedAt,
          deletedAt: null,
        },
        include: { member: true, actorCharacter: true },
      });

      await this.invalidateTimersCache(guildId);
      this.emitUpdateTimer(timer);
      return timer;
    } catch (error) {
      if (error instanceof ExecutionError) {
        const existingTimer = await this.findTimerAfterLockFailure(
          guildId,
          world,
          timerKey,
        );
        if (existingTimer) {
          return existingTimer;
        }

        throw new ConflictException({ message: ErrorKey.TIMER_RACE_CONDITION });
      }
      throw error;
    } finally {
      await lock?.release();
    }
  }

  async closeEventRespawnTimer({
    guildId,
    world,
    npcId,
    npcName,
  }: EventTimerLookupInput) {
    const timerKey = buildTimerKey(npcId, npcName);
    const lockKey = this.getLockKey(world, timerKey, guildId);
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const timer = await this.prisma.timer.findUnique({
        where: { timerId: { guildId, world, timerKey } },
        include: { member: true, actorCharacter: true },
      });

      if (!timer) {
        return null;
      }

      await this.prisma.timer.delete({
        where: { timerId: { guildId, world, timerKey } },
      });

      await this.invalidateTimersCache(guildId);
      this.emitDeleteTimer({
        guildId,
        world,
        npcId,
        timerKey,
        routing: this.getTimerDeleteRouting(timer.npc),
      });

      return timer;
    } catch (error) {
      if (error instanceof ExecutionError) {
        throw new ConflictException({ message: ErrorKey.TIMER_RACE_CONDITION });
      }
      throw error;
    } finally {
      await lock?.release();
    }
  }

  async getActiveTimerKeys(timerLookups: EventTimerLookupInput[], _now: Date) {
    if (timerLookups.length === 0) {
      return new Set<string>();
    }

    const activeTimers = await this.prisma.timer.findMany({
      where: {
        OR: timerLookups.map((timerLookup) => ({
          guildId: timerLookup.guildId,
          world: timerLookup.world,
          timerKey: buildTimerKey(timerLookup.npcId, timerLookup.npcName),
        })),
      },
      select: {
        guildId: true,
        world: true,
        timerKey: true,
      },
    });

    return new Set(
      activeTimers.map(
        (timer) => `${timer.guildId}:${timer.world}:${timer.timerKey}`,
      ),
    );
  }

  async getTimersForEventHeroFilters(
    guildId: string,
    world: string,
    heroes: Array<{ npcId: number | null; npcName: string }>,
  ) {
    if (heroes.length === 0) {
      return [];
    }

    const timerKeys = heroes
      .filter((hero) => hero.npcId !== null)
      .map((hero) => buildTimerKey(hero.npcId as number, hero.npcName));
    const npcNames = heroes
      .filter((hero) => hero.npcId === null)
      .map((hero) => hero.npcName);

    const timersByKey =
      timerKeys.length > 0
        ? await this.prisma.timer.findMany({
            where: {
              guildId,
              world,
              timerKey: { in: timerKeys },
            },
            select: {
              npcId: true,
              timerKey: true,
              world: true,
              minSpawnTime: true,
              maxSpawnTime: true,
              npc: true,
            },
          })
        : [];

    const timersByName =
      npcNames.length > 0
        ? await this.prisma.$queryRaw<
            Array<{
              npcId: number;
              timerKey: string;
              world: string;
              minSpawnTime: Date;
              maxSpawnTime: Date;
              npc: unknown;
            }>
          >`
            SELECT
              t."npcId",
              t."timerKey",
              t."world",
              t."minSpawnTime",
              t."maxSpawnTime",
              t."npc"
            FROM "Timer" t
            WHERE t."guildId" = ${guildId}
              AND t."world" = ${world}
              AND t."npc"->>'name' = ANY(${npcNames}::text[])
          `
        : [];

    const timers = [...timersByKey, ...timersByName];
    const uniqueTimers = new Map<string, (typeof timers)[number]>();
    for (const timer of timers) {
      uniqueTimers.set(timer.timerKey, timer);
    }

    return Array.from(uniqueTimers.values());
  }

  async getTimersForEventHeroLookups(
    lookups: EventHeroTimerLookup[],
  ): Promise<EventHeroTimerLookupResult[]> {
    if (lookups.length === 0) {
      return [];
    }

    const uniqueLookups = Array.from(
      new Map(
        lookups.map((lookup) => [
          JSON.stringify([
            lookup.guildId,
            lookup.world,
            lookup.npcId,
            lookup.npcName,
          ]),
          lookup,
        ]),
      ).values(),
    );
    const keyedLookups = uniqueLookups.filter(
      (lookup): lookup is EventHeroTimerLookup & { npcId: number } =>
        lookup.npcId !== null,
    );
    const nameLookups = uniqueLookups.filter((lookup) => lookup.npcId === null);

    const [timersByKey, timersByName] = await Promise.all([
      keyedLookups.length > 0
        ? this.prisma.timer.findMany({
            where: {
              OR: keyedLookups.map((lookup) => ({
                guildId: lookup.guildId,
                world: lookup.world,
                timerKey: buildTimerKey(lookup.npcId, lookup.npcName),
              })),
            },
            select: {
              guildId: true,
              npcId: true,
              timerKey: true,
              world: true,
              minSpawnTime: true,
              maxSpawnTime: true,
              npc: true,
            },
          })
        : Promise.resolve([]),
      nameLookups.length > 0
        ? this.prisma.$queryRaw<EventHeroTimerLookupResult[]>(
            Prisma.sql`
              SELECT
                t."guildId",
                t."npcId",
                t."timerKey",
                t."world",
                t."minSpawnTime",
                t."maxSpawnTime",
                t."npc"
              FROM "Timer" t
              WHERE ${Prisma.join(
                nameLookups.map(
                  (lookup) => Prisma.sql`(
                    t."guildId" = ${lookup.guildId}
                    AND t."world" = ${lookup.world}
                    AND t."npc"->>'name' = ${lookup.npcName}
                  )`,
                ),
                " OR ",
              )}
            `,
          )
        : Promise.resolve([]),
    ]);

    const uniqueTimers = new Map<string, EventHeroTimerLookupResult>();
    for (const timer of [...timersByKey, ...timersByName]) {
      uniqueTimers.set(
        JSON.stringify([timer.guildId, timer.world, timer.timerKey]),
        timer,
      );
    }

    return Array.from(uniqueTimers.values());
  }

  async getWorldsByGuildId(guildId: string) {
    const worlds = await this.prisma.timer.findMany({
      where: { guildId },
      select: { world: true },
      distinct: ["world"],
    });

    return worlds.map((worldEntry) => worldEntry.world);
  }

  async createTimerForGuild(
    discordId: string,
    userId: string,
    guildId: string,
    data: CreateTimerFromGameClientDto,
  ) {
    const now = new Date();
    if (data.npc.wt < TIMER_LIMITS.MIN_NPC_WT_FOR_TIMERS) {
      throw new BadRequestException({ message: ErrorKey.WT_TOO_LOW });
    }
    const timerKey = buildTimerKey(data.npc.id, data.npc.name);

    const dedupKey = this.getDedupKey(timerKey, data.world, guildId);

    const cached = await this.redis.get(dedupKey);
    if (cached) {
      this.logger.log({
        level: "debug",
        message: `Deduplication hit for ${dedupKey}`,
      });
      return this.mapTimerResponse(
        JSON.parse(cached) as TimerWithOptionalMember,
      );
    }

    const dedupLockKey = `${dedupKey}:lock`;
    const lockKey = this.getLockKey(data.world, timerKey, guildId);
    let dedupLockToken: string | null = null;
    const context: CreateTimerForGuildContext = {
      discordId,
      guildId,
      data,
      now,
      timerKey,
      dedupKey,
      lockKey,
    };

    try {
      dedupLockToken = await this.acquireDedupLock(dedupLockKey);

      if (!dedupLockToken) {
        const dedupResult = await this.waitForTimerDedupResult(
          context,
          dedupLockKey,
        );
        if (dedupResult.response) {
          return dedupResult.response;
        }
        dedupLockToken = dedupResult.lockToken;

        if (!dedupLockToken) {
          throw new ConflictException({
            message: ErrorKey.TIMER_RACE_CONDITION,
          });
        }
      }

      const cachedAfterLock = await this.redis.get(dedupKey);
      if (cachedAfterLock) {
        this.logger.log({
          level: "debug",
          message: `Deduplication hit after lock for ${dedupKey}`,
        });
        return this.mapTimerResponse(
          JSON.parse(cachedAfterLock) as TimerWithOptionalMember,
        );
      }

      const existingTimerAfterTakeover = await this.findTimerAfterLockFailure(
        guildId,
        data.world,
        timerKey,
      );
      if (
        existingTimerAfterTakeover &&
        this.wasTimerUpdatedDuringBurst(existingTimerAfterTakeover, now)
      ) {
        return this.mapTimerResponse(existingTimerAfterTakeover);
      }

      return await this.createOrUpdateTimerForGuild(context);
    } catch (error) {
      if (error instanceof ExecutionError) {
        const existingTimer = await this.findTimerAfterLockFailure(
          guildId,
          data.world,
          timerKey,
        );
        if (
          existingTimer &&
          this.wasTimerUpdatedDuringBurst(existingTimer, now)
        ) {
          this.logger.log({
            level: "debug",
            message: "Lock contention resolved by returning existing timer",
            guildId,
            npcId: data.npc.id,
            world: data.world,
          });
          return this.mapTimerResponse(existingTimer);
        }

        this.logger.log({
          level: "error",
          message: `Lock acquisition failed for createTimerForGuild`,
          guildId,
          npcId: data.npc.id,
          world: data.world,
        });
        throw new ConflictException({ message: ErrorKey.TIMER_RACE_CONDITION });
      }
      throw error;
    } finally {
      await Promise.allSettled([
        dedupLockToken
          ? this.releaseDedupLock(dedupLockKey, dedupLockToken)
          : undefined,
      ]);
    }
  }

  private async acquireDedupLock(dedupLockKey: string) {
    const lockToken = randomUUID();
    const lockAcquired = await this.redis.setNX(
      dedupLockKey,
      lockToken,
      DEDUP_TTL_SECONDS,
    );

    return lockAcquired ? lockToken : null;
  }

  private async releaseDedupLock(dedupLockKey: string, lockToken: string) {
    await this.redis.eval<number>(
      RELEASE_DEDUP_LOCK_SCRIPT,
      [dedupLockKey],
      [lockToken],
    );
  }

  private async waitForTimerDedupResult(
    context: CreateTimerForGuildContext,
    dedupLockKey?: string,
  ) {
    for (let attempt = 0; attempt < DEDUP_WAIT_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, DEDUP_WAIT_DELAY_MS));

      const cachedDuringBurst = await this.redis.get(context.dedupKey);
      if (cachedDuringBurst) {
        return {
          response: this.mapTimerResponse(
            JSON.parse(cachedDuringBurst) as TimerWithOptionalMember,
          ),
          lockToken: null,
        };
      }

      if (dedupLockKey) {
        const lockToken = await this.acquireDedupLock(dedupLockKey);
        if (lockToken) {
          return { response: null, lockToken };
        }
      }
    }

    const existingTimer = await this.findTimerAfterLockFailure(
      context.guildId,
      context.data.world,
      context.timerKey,
    );
    if (
      existingTimer &&
      this.wasTimerUpdatedDuringBurst(existingTimer, context.now)
    ) {
      return {
        response: this.mapTimerResponse(existingTimer),
        lockToken: null,
      };
    }

    return { response: null, lockToken: null };
  }

  private wasTimerUpdatedDuringBurst(
    timer: Pick<Timer, "updatedAt">,
    burstStartedAt: Date,
  ) {
    if (!timer.updatedAt) {
      return false;
    }

    return timer.updatedAt.getTime() >= burstStartedAt.getTime();
  }

  private async createOrUpdateTimerForGuild(
    context: CreateTimerForGuildContext,
  ) {
    let mainLock: Awaited<ReturnType<typeof this.redlock.acquire>> | null =
      null;

    try {
      mainLock = await this.redlock.acquire([context.lockKey], this.lockTtl);

      const { minSpawnTime, maxSpawnTime } = validateAndCalculateSpawnTimes(
        context.data,
        context.now,
      );
      const npcData = this.buildNpcData(context.data.npc);
      const {
        previousTimer,
        migratedSyntheticNpcId,
        migratedSyntheticTimerKey,
      } = await this.findPreviousTimerForKillContext(
        context.guildId,
        context.data.world,
        context.timerKey,
        context.data.npc.id,
        context.data.npc.name,
        npcData,
      );
      const respawnRandomness =
        context.data.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS;
      const actorCharacter = await this.upsertPlayerSnapshot(
        context.data.world,
        context.data.actorCharacter,
      );

      const timerData = {
        maxSpawnTime,
        minSpawnTime,
        world: context.data.world,
        npcId: context.data.npc.id,
        timerKey: context.timerKey,
        latestRespBaseSeconds: context.data.respBaseSeconds,
        latestRespawnRandomness: respawnRandomness,
        wasReset: false,
        npc: npcData,
        windowOpenedAt: new Date(),
        actorCharacter: actorCharacter
          ? { connect: { id: actorCharacter.id } }
          : undefined,
        actorCharacterLvl: context.data.actorCharacter?.lvl ?? null,
        deletedAt: null,
        member: {
          connect: {
            memberId: { userId: context.discordId, guildId: context.guildId },
          },
        },
      };

      const newTimer = await this.prisma.timer.upsert({
        where: {
          timerId: {
            guildId: context.guildId,
            world: context.data.world,
            timerKey: context.timerKey,
          },
        },
        create: {
          ...timerData,
          guild: { connect: { id: context.guildId } },
        },
        update: timerData,
        include: { member: true, actorCharacter: true },
      });

      await this.createTimerHistoryEntryIfNotManual({
        guildId: context.guildId,
        world: context.data.world,
        timerKey: context.timerKey,
        npcId: context.data.npc.id,
        npc: npcData,
        action: TimerHistoryAction.CREATE,
        actorMemberId: newTimer.createdById,
        actorCharacterSnapshotId: actorCharacter?.id,
        actorCharacterLvl: context.data.actorCharacter?.lvl,
        minSpawnTime,
        maxSpawnTime,
        ...this.getHistorySnapshotFromTimer(newTimer),
      });

      await Promise.all([
        this.redis.set(
          context.dedupKey,
          JSON.stringify(newTimer),
          DEDUP_TTL_SECONDS,
        ),
        this.invalidateTimersCache(context.guildId),
      ]);

      if (migratedSyntheticNpcId !== null) {
        this.emitDeleteTimer({
          guildId: context.guildId,
          world: context.data.world,
          npcId: migratedSyntheticNpcId,
          timerKey: migratedSyntheticTimerKey ?? undefined,
          routing: {
            tier: getNpcRoutingTier(npcData),
            npcLevel: npcData.lvl,
          },
        });
      }

      this.emitUpdateTimer(newTimer);

      await this.eventTimerHooks
        .enqueueEventHeroKillCheck({
          guildId: context.guildId,
          world: context.data.world,
          npcId: context.data.npc.id,
          npcName: context.data.npc.name,
          npcIcon: context.data.npc.icon,
          npcLvl: context.data.npc.lvl,
          timerData: {
            minSpawnTime,
            maxSpawnTime,
            memberId: newTimer.createdById,
            previousMinSpawnTime: previousTimer?.minSpawnTime ?? null,
            previousMaxSpawnTime: previousTimer?.maxSpawnTime ?? null,
            windowOpenedAt: previousTimer?.windowOpenedAt ?? null,
          },
        })
        .catch((error) => {
          this.logger.error({
            message: "Failed to enqueue event hero kill check",
            error: error instanceof Error ? error.message : error,
            guildId: context.guildId,
            world: context.data.world,
            npcId: context.data.npc.id,
          });
        });

      return this.mapTimerResponse(newTimer);
    } finally {
      await mainLock?.release();
    }
  }

  async createAutoTimer(
    discordId: string,
    userId: string,
    data: CreateTimerFromGameClientDto,
  ): Promise<CreateAutoTimerResponse> {
    if (data.npc.wt < TIMER_LIMITS.MIN_NPC_WT_FOR_TIMERS) {
      throw new BadRequestException({ message: ErrorKey.WT_TOO_LOW });
    }
    validateAndCalculateSpawnTimes(data, new Date());

    const [guilds, characterConfig] = await Promise.all([
      this.guildsService.getGuildsForRequiredPermissions(discordId, [
        Permission.LOOTLOG_TIMERS_WRITE,
      ]),
      this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        data.accountId,
        data.characterId,
      ),
    ]);

    if (guilds.length === 0) {
      throw new ForbiddenException();
    }

    const catchingGuildIds = new Set(characterConfig?.catchingGuildIds ?? []);
    const targetGuilds = guilds.filter((guild) =>
      catchingGuildIds.has(guild.id),
    );
    const rejectedGuilds = guilds
      .filter((guild) => !catchingGuildIds.has(guild.id))
      .map((guild) =>
        this.createAutoTimerRejectedGuild(guild, "NOT_ON_CATCHING_WHITELIST"),
      );

    if (targetGuilds.length === 0) {
      this.throwCreateAutoTimerBadRequest(
        ErrorKey.NO_GUILDS_ON_THE_CATCHING_WHITELIST,
        rejectedGuilds,
      );
    }

    const results = await Promise.allSettled(
      targetGuilds.map(async (guild) => {
        await this.createTimerForGuild(discordId, userId, guild.id, data);
        return guild;
      }),
    );

    const submittedGuilds: CreateAutoTimerSubmittedGuild[] = [];

    results.forEach((result, index) => {
      const guild = targetGuilds[index];

      if (result.status === "fulfilled") {
        submittedGuilds.push({
          guildId: guild.id,
          guildName: guild.name,
        });
        return;
      }

      this.logger.warn({
        message: "Automatic timer creation failed for guild",
        guildId: guild.id,
        world: data.world,
        npcId: data.npc.id,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : result.reason,
      });
      rejectedGuilds.push(
        this.createAutoTimerRejectedGuild(guild, "TIMER_CREATE_FAILED"),
      );
    });

    if (submittedGuilds.length === 0) {
      this.throwCreateAutoTimerBadRequest(
        ErrorKey.NO_GUILD_ACCEPTS_THIS_TIMER,
        rejectedGuilds,
      );
    }

    return this.createAutoTimerResponse({
      submittedGuilds,
      rejectedGuilds,
    });
  }

  async createManualTimer(
    discordId: string,
    guildId: string,
    data: CreateManualTimerDto,
  ) {
    const now = new Date();

    let minSpawnTime: Date;
    let maxSpawnTime: Date;
    let latestRespBaseSeconds: number;
    let latestRespawnRandomness: number;

    if (data.customMinSpawnTime && data.customMaxSpawnTime) {
      minSpawnTime = new Date(data.customMinSpawnTime);
      maxSpawnTime = new Date(data.customMaxSpawnTime);

      const diffMs = maxSpawnTime.getTime() - minSpawnTime.getTime();
      const midpointSeconds = Math.round(diffMs / 2000);
      latestRespBaseSeconds = midpointSeconds;
      latestRespawnRandomness = midpointSeconds > 0 ? 100 : 0;
    } else if (data.minSeconds && data.maxSeconds) {
      minSpawnTime = new Date(now.getTime() + data.minSeconds * 1000);
      maxSpawnTime = new Date(now.getTime() + data.maxSeconds * 1000);

      const avgSeconds = Math.round((data.minSeconds + data.maxSeconds) / 2);
      const varianceSeconds = data.maxSeconds - avgSeconds;
      latestRespBaseSeconds = avgSeconds;
      latestRespawnRandomness =
        avgSeconds > 0 ? Math.round((varianceSeconds / avgSeconds) * 100) : 0;
    } else {
      throw new BadRequestException({
        message:
          "Either minSeconds/maxSeconds or customMinSpawnTime/customMaxSpawnTime must be provided",
      });
    }

    const npcId = generateUniqueIntId();
    const timerKey = buildTimerKey(npcId, data.name);
    const actorCharacter = await this.upsertPlayerSnapshot(
      data.world,
      data.actorCharacter,
    );

    const newTimer = await this.prisma.timer.create({
      data: {
        maxSpawnTime,
        minSpawnTime,
        npcId,
        timerKey,
        world: data.world,
        latestRespBaseSeconds,
        latestRespawnRandomness,
        wasReset: false,
        npc: {
          id: npcId,
          name: data.name,
          prof: data.prof ?? "",
          location: "",
          wt: "",
          lvl: data.lvl ?? 0,
          type: data.type ?? "",
          icon: "",
          margonemType: TIMER_TYPES.CUSTOM_MANUAL,
        },
        actorCharacter: actorCharacter
          ? { connect: { id: actorCharacter.id } }
          : undefined,
        actorCharacterLvl: data.actorCharacter?.lvl ?? null,
        deletedAt: null,
        guild: { connect: { id: guildId } },
        member: { connect: { memberId: { userId: discordId, guildId } } },
      },
      include: { member: true, actorCharacter: true },
    });

    await this.invalidateTimersCache(guildId);
    this.emitUpdateTimer(newTimer);
    return this.mapTimerResponse(newTimer);
  }

  async getTimers(
    userId: string,
    viewerDiscordId: string,
    { world }: GetTimersDto,
    guild: Guild,
    roles: Role[],
  ) {
    const now = new Date();
    const accessContext = createStrategicAccessContext({
      organizationId: guild.id,
      ownerId: guild.ownerId,
      viewerDiscordId,
      roles,
    });
    const alwaysVisibleExpiredTimerKeys =
      await this.getAlwaysVisibleExpiredTimerKeys(userId, world);
    const cacheKey = this.getTimersCacheKey(guild.id, userId, world);
    const cached =
      await this.redis.getJson<TimerWithOptionalMember[]>(cacheKey);

    if (cached !== null) {
      this.logger.log({ level: "debug", message: `Cache hit for ${cacheKey}` });
      return this.filterTimersByPermissions(cached, accessContext).map(
        (timer) => this.mapTimerResponse(timer),
      );
    }

    this.logger.log({ level: "debug", message: `Cache miss for ${cacheKey}` });

    const timers = await this.redis.getOrSetJson({
      key: cacheKey,
      ttlSeconds: CACHE_TTL_SECONDS,
      factory: () =>
        this.prisma.timer.findMany({
          where: this.getTimersWhere(
            guild.id,
            world,
            alwaysVisibleExpiredTimerKeys,
            now,
          ),
          orderBy: { maxSpawnTime: "desc" },
          include: { member: true, actorCharacter: true },
        }),
    });

    return this.filterTimersByPermissions(timers, accessContext).map((timer) =>
      this.mapTimerResponse(timer),
    );
  }

  private filterTimersByPermissions(
    timers: TimerWithOptionalMember[],
    accessContext: NpcAccessContext,
  ): TimerWithOptionalMember[] {
    return timers.filter((timer) => {
      const npc = parseNpc(timer.npc);
      if (!npc) return false;

      return canViewStrategicNpc(
        accessContext,
        {
          organizationId: timer.guildId,
          world: timer.world,
          npc: {
            id: timer.npcId,
            type: npc.type,
            group: null,
            level: npc.lvl,
          },
        },
        TIMER_VISIBILITY_PERMISSIONS,
      );
    });
  }

  private assertCanActOnTimer(
    guild: Guild,
    viewerDiscordId: string,
    roles: Role[],
    timer: Pick<Timer, "guildId" | "world" | "npcId" | "npc">,
    actionPermission: Permission,
  ) {
    const npc = parseNpc(timer.npc);
    const accessContext = createStrategicAccessContext({
      organizationId: guild.id,
      ownerId: guild.ownerId,
      viewerDiscordId,
      roles,
    });
    const allowed =
      npc &&
      canActOnStrategicNpc(
        accessContext,
        {
          organizationId: timer.guildId,
          world: timer.world,
          npc: {
            id: timer.npcId,
            type: npc.type,
            group: null,
            level: npc.lvl,
          },
        },
        TIMER_VISIBILITY_PERMISSIONS,
        actionPermission,
      );

    if (!allowed) {
      throw new ForbiddenException();
    }
  }

  async getAllTimers(
    discordId: string,
    userId: string,
    { world }: GetTimersDto,
  ) {
    const now = new Date();
    const alwaysVisibleExpiredTimerKeys =
      await this.getAlwaysVisibleExpiredTimerKeys(userId, world);
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_TIMERS_READ],
    );

    if (guilds.length === 0) throw new ForbiddenException();

    const guildIds = guilds.map((guild) => guild.id);
    const [timers, permissionsPerGuild] = await Promise.all([
      this.prisma.timer.findMany({
        where: this.getTimersWhere(
          guildIds,
          world,
          alwaysVisibleExpiredTimerKeys,
          now,
        ),
        orderBy: { maxSpawnTime: "desc" },
        include: { member: true, actorCharacter: true },
      }),
      this.guildsService.getMultipleGuildsPermissions(discordId, guildIds),
    ]);

    const timersByGuild = timers.reduce<
      Record<string, TimerWithOptionalMember[]>
    >((acc, timer) => {
      (acc[timer.guildId] ??= []).push(timer);
      return acc;
    }, {});

    return guilds.flatMap((guild) => {
      const guildPermissionsAndRoles = permissionsPerGuild.find(
        (p) => p.guild.id === guild.id,
      );

      const roles = guildPermissionsAndRoles?.roles ?? [];
      const guildTimers = timersByGuild[guild.id] ?? [];
      const accessContext = createStrategicAccessContext({
        organizationId: guild.id,
        ownerId: guild.ownerId,
        viewerDiscordId: discordId,
        roles,
      });

      return this.filterTimersByPermissions(guildTimers, accessContext).map(
        (timer) => this.mapTimerResponse(timer),
      );
    });
  }

  async getTimerHistory(
    guild: Guild,
    world: string,
    timerIdentifier: string,
    options: {
      limit?: number;
      viewerDiscordId: string;
      roles: Role[];
    },
  ) {
    const guildId = guild.id;
    const limit =
      options.limit && options.limit > 0 ? Math.min(options.limit, 20) : 5;
    const resolvedTimer = await this.findTimerByIdentifier(
      guildId,
      world,
      timerIdentifier,
    );
    const timerKey = resolvedTimer?.timerKey ?? timerIdentifier;
    const accessContext = createStrategicAccessContext({
      organizationId: guildId,
      ownerId: guild.ownerId,
      viewerDiscordId: options.viewerDiscordId,
      roles: options.roles,
    });
    const visibilityWhere = buildNpcJsonVisibilityWhere(
      accessContext,
      TIMER_VISIBILITY_PERMISSIONS,
    );

    const entries = await this.prisma.timerHistoryEntry.findMany({
      where: {
        guildId,
        world,
        timerKey,
        ...visibilityWhere,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        guild: {
          select: { name: true },
        },
        actorMember: true,
        actorCharacter: true,
      },
    });

    return entries.map((entry) => this.mapTimerHistoryResponse(entry));
  }

  async getRecentTimerHistory(
    discordId: string,
    guildId: string,
    world: string,
    options: { limit?: number },
  ) {
    const limit =
      options.limit && options.limit > 0 ? Math.min(options.limit, 20) : 5;
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_TIMERS_READ],
    );

    if (guilds.length === 0) {
      throw new ForbiddenException();
    }

    const guild = guilds.find(
      (candidateGuild) => candidateGuild.id === guildId,
    );

    if (!guild) {
      throw new ForbiddenException();
    }

    const [guildPermissionsAndRoles] =
      await this.guildsService.getMultipleGuildsPermissions(discordId, [
        guildId,
      ]);

    const roles = guildPermissionsAndRoles?.roles ?? [];
    const accessContext = createStrategicAccessContext({
      organizationId: guildId,
      ownerId: guild.ownerId,
      viewerDiscordId: discordId,
      roles,
    });
    const visibilityWhere = buildNpcJsonVisibilityWhere(
      accessContext,
      TIMER_VISIBILITY_PERMISSIONS,
    );

    const entries = await this.prisma.timerHistoryEntry.findMany({
      where: {
        guildId,
        world,
        ...visibilityWhere,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        guild: {
          select: { name: true },
        },
        actorMember: true,
        actorCharacter: true,
        timerCreatedBy: true,
        timerActorCharacter: true,
      },
    });

    return entries.map((entry) => this.mapTimerHistoryResponse(entry));
  }

  async restoreTimerFromHistory(
    discordId: string,
    guild: Guild,
    roles: Role[],
    historyEntryId: number,
  ) {
    const guildId = guild.id;
    const entry = await this.prisma.timerHistoryEntry.findUnique({
      where: { id: historyEntryId },
      include: {
        actorMember: true,
        actorCharacter: true,
        timerCreatedBy: true,
        timerActorCharacter: true,
      },
    });

    if (!entry || entry.guildId !== guildId) {
      throw new NotFoundException({
        message: ErrorKey.TIMER_HISTORY_ENTRY_NOT_FOUND,
      });
    }

    this.assertCanActOnTimer(
      guild,
      discordId,
      roles,
      entry,
      Permission.LOOTLOG_TIMERS_WRITE,
    );

    if (
      entry.action !== TimerHistoryAction.DELETE ||
      entry.timerCreatedById === null ||
      entry.minSpawnTime === null ||
      entry.maxSpawnTime === null ||
      entry.latestRespBaseSeconds === null ||
      entry.latestRespawnRandomness === null
    ) {
      throw new BadRequestException({
        message: ErrorKey.TIMER_HISTORY_ENTRY_CANNOT_BE_RESTORED,
      });
    }

    const existingTimer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId,
          world: entry.world,
          timerKey: entry.timerKey,
        },
      },
    });

    if (existingTimer && existingTimer.deletedAt === null) {
      throw new ConflictException({ message: ErrorKey.EXISTING_TIMER });
    }

    const restoredTimer = await this.prisma.timer.upsert({
      where: {
        timerId: {
          guildId,
          world: entry.world,
          timerKey: entry.timerKey,
        },
      },
      create: {
        createdById: entry.timerCreatedById,
        guildId,
        npcId: entry.npcId,
        timerKey: entry.timerKey,
        world: entry.world,
        minSpawnTime: entry.minSpawnTime,
        maxSpawnTime: entry.maxSpawnTime,
        latestRespBaseSeconds: entry.latestRespBaseSeconds,
        latestRespawnRandomness: entry.latestRespawnRandomness,
        wasReset: entry.wasReset ?? false,
        npc: entry.npc as Prisma.InputJsonValue,
        windowOpenedAt: entry.windowOpenedAt,
        actorCharacterSnapshotId: entry.timerActorCharacterSnapshotId,
        actorCharacterLvl: entry.timerActorCharacterLvl,
        deletedAt: null,
      },
      update: {
        createdById: entry.timerCreatedById,
        npcId: entry.npcId,
        minSpawnTime: entry.minSpawnTime,
        maxSpawnTime: entry.maxSpawnTime,
        latestRespBaseSeconds: entry.latestRespBaseSeconds,
        latestRespawnRandomness: entry.latestRespawnRandomness,
        wasReset: entry.wasReset ?? false,
        npc: entry.npc as Prisma.InputJsonValue,
        windowOpenedAt: entry.windowOpenedAt,
        actorCharacterSnapshotId: entry.timerActorCharacterSnapshotId,
        actorCharacterLvl: entry.timerActorCharacterLvl,
        deletedAt: null,
      },
      include: { member: true, actorCharacter: true },
    });

    await this.createTimerHistoryEntryIfNotManual({
      guildId,
      world: entry.world,
      timerKey: entry.timerKey,
      npcId: entry.npcId,
      npc: entry.npc as Prisma.InputJsonValue,
      action: TimerHistoryAction.RESTORE,
      actorMemberUserId: discordId,
      minSpawnTime: entry.minSpawnTime,
      maxSpawnTime: entry.maxSpawnTime,
      ...this.getHistorySnapshotFromTimer(restoredTimer),
    });

    await this.invalidateTimersCache(guildId);
    this.emitUpdateTimer(restoredTimer);
    return this.mapTimerResponse(restoredTimer);
  }

  async resetTimer(
    discordId: string,
    guild: Guild,
    roles: Role[],
    timerIdentifier: string,
    data: ResetTimerDto,
  ) {
    const guildId = guild.id;
    const now = new Date();
    const resolvedTimer = await this.findTimerByIdentifier(
      guildId,
      data.world,
      timerIdentifier,
    );

    if (!resolvedTimer) {
      throw new NotFoundException({ message: ErrorKey.TIMER_NOT_FOUND });
    }

    this.assertCanActOnTimer(
      guild,
      discordId,
      roles,
      resolvedTimer,
      Permission.LOOTLOG_TIMERS_RESET,
    );

    const eventHero = await this.eventTimerHooks.findActiveEventHeroByNpc(
      guildId,
      data.world,
      resolvedTimer.npcId,
      extractNpcName(resolvedTimer.npc),
    );

    if (eventHero) {
      throw new BadRequestException({
        message: ErrorKey.EVENT_TIMER_CANNOT_BE_RESET,
      });
    }

    const lockKey = this.getLockKey(
      data.world,
      resolvedTimer.timerKey,
      guildId,
    );
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const timer = await this.prisma.timer.findUnique({
        where: {
          timerId: {
            guildId,
            world: data.world,
            timerKey: resolvedTimer.timerKey,
          },
        },
      });

      if (!timer) {
        throw new NotFoundException({ message: ErrorKey.TIMER_NOT_FOUND });
      }

      const { minSpawnTime, maxSpawnTime } = this.calculateRespawnTime(
        timer.latestRespBaseSeconds,
        timer.latestRespawnRandomness,
        now,
      );
      const actorCharacter = await this.upsertPlayerSnapshot(
        data.world,
        data.actorCharacter,
      );
      const actorCharacterUpdate = data.actorCharacter
        ? {
            actorCharacter: actorCharacter
              ? { connect: { id: actorCharacter.id } }
              : undefined,
            actorCharacterLvl: data.actorCharacter.lvl ?? null,
          }
        : {};

      const updatedTimer = await this.prisma.timer.update({
        where: {
          timerId: {
            guildId,
            world: data.world,
            timerKey: resolvedTimer.timerKey,
          },
        },
        data: {
          minSpawnTime,
          maxSpawnTime,
          wasReset: true,
          deletedAt: null,
          ...actorCharacterUpdate,
          member: { connect: { memberId: { userId: discordId, guildId } } },
        },
        include: { member: true, actorCharacter: true },
      });

      await this.createTimerHistoryEntryIfNotManual({
        guildId,
        world: data.world,
        timerKey: resolvedTimer.timerKey,
        npcId: resolvedTimer.npcId,
        npc: resolvedTimer.npc as Prisma.InputJsonValue,
        action: TimerHistoryAction.RESET,
        actorMemberId: updatedTimer.createdById,
        actorCharacterSnapshotId: actorCharacter?.id,
        actorCharacterLvl: data.actorCharacter?.lvl,
        minSpawnTime,
        maxSpawnTime,
        ...this.getHistorySnapshotFromTimer(updatedTimer),
      });

      await this.invalidateTimersCache(guildId);
      this.emitUpdateTimer(updatedTimer);
      return this.mapTimerResponse(updatedTimer);
    } catch (error) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: "error",
          message: `Lock acquisition failed for resetTimer`,
          guildId,
          npcId: resolvedTimer.npcId,
          world: data.world,
        });
        throw new ConflictException({ message: ErrorKey.TIMER_RACE_CONDITION });
      }
      throw error;
    } finally {
      await lock?.release();
    }
  }

  async deleteTimer(
    discordId: string,
    guild: Guild,
    roles: Role[],
    timerIdentifier: string,
    world: string,
  ) {
    const guildId = guild.id;

    const resolvedTimer = await this.findTimerByIdentifier(
      guildId,
      world,
      timerIdentifier,
    );

    if (!resolvedTimer) {
      throw new NotFoundException({ message: ErrorKey.TIMER_NOT_FOUND });
    }

    this.assertCanActOnTimer(
      guild,
      discordId,
      roles,
      resolvedTimer,
      Permission.LOOTLOG_TIMERS_DELETE,
    );

    const eventHero = await this.eventTimerHooks.findActiveEventHeroByNpc(
      guildId,
      world,
      resolvedTimer.npcId,
      extractNpcName(resolvedTimer.npc),
    );

    if (eventHero) {
      throw new BadRequestException({
        message: ErrorKey.EVENT_TIMER_MUST_USE_EVENT_CLOSE,
      });
    }

    try {
      await this.createTimerHistoryEntryIfNotManual({
        guildId,
        world,
        timerKey: resolvedTimer.timerKey,
        npcId: resolvedTimer.npcId,
        npc: resolvedTimer.npc as Prisma.InputJsonValue,
        action: TimerHistoryAction.DELETE,
        actorMemberId: discordId ? undefined : resolvedTimer.createdById,
        actorMemberUserId: discordId || undefined,
        minSpawnTime: resolvedTimer.minSpawnTime,
        maxSpawnTime: resolvedTimer.maxSpawnTime,
        ...this.getHistorySnapshotFromTimer(resolvedTimer),
      });

      if (this.isManualTimerNpc(resolvedTimer.npc)) {
        await this.prisma.timer.delete({
          where: {
            timerId: { guildId, world, timerKey: resolvedTimer.timerKey },
          },
        });
      } else {
        await this.prisma.timer.update({
          where: {
            timerId: { guildId, world, timerKey: resolvedTimer.timerKey },
          },
          data: { deletedAt: new Date() },
        });
      }

      await this.invalidateTimersCache(guildId);
      this.emitDeleteTimer({
        npcId: resolvedTimer.npcId,
        timerKey: resolvedTimer.timerKey,
        world,
        guildId,
        routing: this.getTimerDeleteRouting(resolvedTimer.npc),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException({ message: ErrorKey.TIMER_NOT_FOUND });
      }
      throw error;
    }
  }

  emitUpdateTimer(payload: TimerWithOptionalMember) {
    const response = this.mapTimerResponse(payload);

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_UPDATE,
      response,
    );
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_TIMER_UPDATED,
      response,
    );
  }

  emitDeleteTimer(
    payload: Partial<Timer> & {
      routing: { tier: "base" | "titans" | "heroes"; npcLevel?: number };
    },
  ) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_DELETE,
      payload,
    );
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_TIMER_DELETED,
      payload,
    );
  }

  async searchNpcsWithTimerData(
    guild: Guild,
    viewerDiscordId: string,
    roles: Role[],
    world: string,
    search: string,
    limit = 10,
  ) {
    const limitNum = Number(limit) || 10;
    const manualTimerType = String(TIMER_TYPES.CUSTOM_MANUAL);
    const accessContext = createStrategicAccessContext({
      organizationId: guild.id,
      ownerId: guild.ownerId,
      viewerDiscordId,
      roles,
    });
    const visibilityCondition = buildNpcJsonVisibilitySqlCondition(
      accessContext,
      TIMER_VISIBILITY_PERMISSIONS,
      "t",
      5,
    );
    const limitParameterIndex = 5 + visibilityCondition.params.length;
    const timers = await this.prisma.$queryRawUnsafe<Timer[]>(
      `
      SELECT DISTINCT ON (t."timerKey")
        t."npc",
        t."npcId",
        t."timerKey",
        t."latestRespBaseSeconds",
        t."latestRespawnRandomness"
      FROM "Timer" t
      WHERE t."guildId" = $1
        AND t."world" = $2
        AND t."deletedAt" IS NULL
        AND t."npc"->>'name' ILIKE $3
        AND COALESCE(t."npc"->>'margonemType', '0') != $4
        ${visibilityCondition.sql}
      ORDER BY t."timerKey", t."updatedAt" DESC
      LIMIT $${limitParameterIndex}
    `,
      guild.id,
      world,
      `%${search}%`,
      manualTimerType,
      ...visibilityCondition.params,
      limitNum,
    );

    return timers
      .map((timer) => {
        const npc = parseNpc(timer.npc);
        if (!npc) return null;

        return {
          npcId: timer.npcId,
          timerKey: timer.timerKey,
          name: (timer.npc as { name?: string })?.name ?? "",
          lvl: npc.lvl,
          type: npc.type,
          prof: (timer.npc as { prof?: string })?.prof ?? "",
          location: (timer.npc as { location?: string })?.location ?? "",
          wt: (timer.npc as { wt?: string | number })?.wt ?? 0,
          icon: (timer.npc as { icon?: string })?.icon ?? "",
          latestRespBaseSeconds: timer.latestRespBaseSeconds,
          latestRespawnRandomness: timer.latestRespawnRandomness,
        };
      })
      .filter(Boolean);
  }

  calculateRespawnTime(
    respBaseSeconds: number,
    respawnRandomness = DEFAULT_RESPAWN_RANDOMNESS,
    now: Date,
  ) {
    const dateMs = now.getTime();
    const respMs = respBaseSeconds * 1000;
    const multiplier = respawnRandomness / 100;
    const variance = Math.round(respMs * multiplier);

    return {
      minSpawnTime: new Date(dateMs + respMs - variance),
      maxSpawnTime: new Date(dateMs + respMs + variance),
    };
  }
}
