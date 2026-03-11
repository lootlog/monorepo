import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  type OnModuleInit,
} from "@nestjs/common";
import {
  NpcType,
  Permission,
  Prisma,
  type Timer,
  type Guild,
  type Role,
} from "generated/client";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { getNpcTypeByWt } from "src/shared/utils/get-npc-type-by-wt";
import { getProfByShortname } from "src/shared/utils/get-prof-by-shortname";
import { ErrorKey } from "src/timers/enum/error-key.enum";
import { GuildsService } from "src/guilds/guilds.service";
import type { GetTimersDto } from "src/timers/dto/get-timers.dto";
import type { ResetTimerDto } from "src/timers/dto/reset-timer.dto";
import { DEFAULT_RESPAWN_RANDOMNESS } from "src/timers/constants/respawn";
import type { CreateManualTimerDto } from "src/timers/dto/create-manual-timer.dto";
import { generateUniqueIntId } from "src/shared/utils/generate-unique-int-id";
import { RoutingKey } from "src/enum/routing-key.enum";
import { isAdministrativeUser } from "src/shared/permissions/is-administrative-user";
import { canViewNpcTimer } from "@lootlog/api-helpers/permissions";
import type { CreateTimerFromGameClientDto } from "src/timers/dto/create-timer-from-game-client.dto";
import { validateAndCalculateSpawnTimes } from "src/timers/utils/validate-spawn-times";
import { TIMER_LIMITS, TIMER_TYPES } from "src/timers/constants/timer-limits";
import { RedisService } from "src/lib/redis/redis.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import Redlock, { ExecutionError } from "redlock";
import { EventsService } from "src/events/events.service";
import { getSyntheticNpcId } from "src/events/utils/get-synthetic-npc-id";

function parseNpc(npc: unknown): { lvl: number; type: NpcType } | null {
  if (!npc) return null;
  if (typeof npc === "string") {
    return JSON.parse(npc);
  }
  return npc as { lvl: number; type: NpcType };
}

const DEDUP_TTL_SECONDS = 10;
const CACHE_TTL_SECONDS = 2;

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

@Injectable()
export class TimersService implements OnModuleInit {
  private redlock: Redlock;
  private readonly lockTtl = 10000;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {}

  async onModuleInit() {
    const client = await this.redis.getClient();
    this.redlock = new Redlock([client], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 100,
      retryJitter: 50,
      automaticExtensionThreshold: 5000,
    });
  }

  private getLockKey(world: string, npcId: number, guildId: string): string {
    return `timer:lock:${guildId}:${world}:${npcId}`;
  }

  private getDedupKey(
    userId: string,
    npcId: number,
    world: string,
    guildId: string,
  ): string {
    return `timer:dedup:${userId}:${npcId}:${world}:${guildId}`;
  }

  private getTimersCacheKey(guildId: string, world?: string): string {
    return `timer:list:${guildId}:${world || "all"}`;
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
    prof: string;
    location: string;
    wt: number;
    lvl: number;
    type: number;
    icon: string;
  }): NpcData {
    return {
      id: npc.id,
      name: npc.name,
      prof: getProfByShortname(npc.prof),
      location: npc.location,
      wt: String(npc.wt),
      lvl: npc.lvl,
      type: getNpcTypeByWt(npc.wt, npc.prof, npc.type),
      icon: npc.icon,
      margonemType: String(npc.type),
    };
  }

  private async findPreviousTimerForKillContext(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    npcData: NpcData,
  ): Promise<{
    previousTimer: Timer | null;
    migratedSyntheticNpcId: number | null;
  }> {
    const previousTimer = await this.prisma.timer.findUnique({
      where: { timerId: { guildId, world, npcId } },
    });
    if (previousTimer) {
      return { previousTimer, migratedSyntheticNpcId: null };
    }

    try {
      const heroMatch = await this.eventsService.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );
      if (!heroMatch || heroMatch.eventHero.npcId !== null) {
        return { previousTimer: null, migratedSyntheticNpcId: null };
      }

      const syntheticNpcId = getSyntheticNpcId(heroMatch.eventHero.id);
      if (syntheticNpcId === npcId) {
        return { previousTimer: null, migratedSyntheticNpcId: null };
      }

      const syntheticTimer = await this.prisma.timer.findUnique({
        where: { timerId: { guildId, world, npcId: syntheticNpcId } },
      });
      if (!syntheticTimer) {
        return { previousTimer: null, migratedSyntheticNpcId: null };
      }

      const migratedTimer = await this.prisma.timer.upsert({
        where: { timerId: { guildId, world, npcId } },
        create: {
          createdById: syntheticTimer.createdById,
          guildId,
          npcId,
          world,
          minSpawnTime: syntheticTimer.minSpawnTime,
          maxSpawnTime: syntheticTimer.maxSpawnTime,
          latestRespBaseSeconds: syntheticTimer.latestRespBaseSeconds,
          latestRespawnRandomness: syntheticTimer.latestRespawnRandomness,
          tempId: syntheticTimer.tempId,
          wasReset: syntheticTimer.wasReset,
          npc: npcData,
          windowOpenedAt: syntheticTimer.windowOpenedAt,
        },
        update: {},
      });

      try {
        await this.prisma.timer.delete({
          where: { timerId: { guildId, world, npcId: syntheticNpcId } },
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
      };
    } catch (error) {
      this.logger.warn({
        level: "warn",
        message: "Failed to resolve synthetic timer context for event hero",
        guildId,
        world,
        npcId,
        npcName,
        error: error instanceof Error ? error.message : error,
      });
      return { previousTimer: null, migratedSyntheticNpcId: null };
    }
  }

  private async findTimerAfterLockFailure(
    guildId: string,
    world: string,
    npcId: number,
  ) {
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const timer = await this.prisma.timer.findUnique({
        where: { timerId: { guildId, world, npcId } },
        include: { member: true },
      });
      if (timer) {
        return timer;
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    return null;
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

    const dedupKey = this.getDedupKey(
      discordId,
      data.npc.id,
      data.world,
      guildId,
    );

    const cached = await this.redis.get(dedupKey);
    if (cached) {
      this.logger.log({
        level: "debug",
        message: `Deduplication hit for ${dedupKey}`,
      });
      return JSON.parse(cached) as Timer;
    }

    const dedupLockKey = `${dedupKey}:lock`;
    const lockKey = this.getLockKey(data.world, data.npc.id, guildId);
    let dedupLock: Awaited<ReturnType<typeof this.redlock.acquire>> | null =
      null;
    let mainLock: Awaited<ReturnType<typeof this.redlock.acquire>> | null =
      null;

    try {
      dedupLock = await this.redlock.acquire([dedupLockKey], this.lockTtl);

      const cachedAfterLock = await this.redis.get(dedupKey);
      if (cachedAfterLock) {
        this.logger.log({
          level: "debug",
          message: `Deduplication hit after lock for ${dedupKey}`,
        });
        return JSON.parse(cachedAfterLock) as Timer;
      }

      mainLock = await this.redlock.acquire([lockKey], this.lockTtl);

      const { minSpawnTime, maxSpawnTime } = validateAndCalculateSpawnTimes(
        data,
        now,
      );
      const npcData = this.buildNpcData(data.npc);
      const { previousTimer, migratedSyntheticNpcId } =
        await this.findPreviousTimerForKillContext(
          guildId,
          data.world,
          data.npc.id,
          data.npc.name,
          npcData,
        );
      const respawnRandomness =
        data.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS;

      if (previousTimer && previousTimer.minSpawnTime > now) {
        const existingTimer = await this.prisma.timer.findUnique({
          where: {
            timerId: { guildId, world: data.world, npcId: data.npc.id },
          },
          include: { member: true },
        });
        const duplicateTimer = existingTimer ?? previousTimer;

        await this.redis.set(
          dedupKey,
          JSON.stringify(duplicateTimer),
          DEDUP_TTL_SECONDS,
        );

        this.logger.log({
          level: "debug",
          message: "Skipping timer update before minSpawnTime",
          guildId,
          npcId: data.npc.id,
          world: data.world,
          minSpawnTime: previousTimer.minSpawnTime,
        });

        return duplicateTimer as Timer;
      }

      const timerData = {
        maxSpawnTime,
        minSpawnTime,
        world: data.world,
        npcId: data.npc.id,
        latestRespBaseSeconds: data.respBaseSeconds,
        latestRespawnRandomness: respawnRandomness,
        wasReset: false,
        npc: npcData,
        windowOpenedAt: new Date(),
        member: { connect: { memberId: { userId: discordId, guildId } } },
      };

      const newTimer = await this.prisma.timer.upsert({
        where: { timerId: { guildId, world: data.world, npcId: data.npc.id } },
        create: { ...timerData, guild: { connect: { id: guildId } } },
        update: timerData,
        include: { member: true },
      });

      await Promise.all([
        this.redis.set(dedupKey, JSON.stringify(newTimer), DEDUP_TTL_SECONDS),
        this.invalidateTimersCache(guildId),
      ]);

      if (migratedSyntheticNpcId !== null) {
        this.emitDeleteTimer({
          guildId,
          world: data.world,
          npcId: migratedSyntheticNpcId,
        });
      }

      this.emitUpdateTimer(newTimer);

      await this.eventsService
        .enqueueEventHeroKillCheck({
          guildId,
          world: data.world,
          npcId: data.npc.id,
          npcName: data.npc.name,
          npcIcon: data.npc.icon,
          npcLvl: data.npc.lvl,
          timerData: {
            minSpawnTime,
            maxSpawnTime,
            memberId: newTimer.createdById,
            previousMinSpawnTime: previousTimer?.minSpawnTime ?? null,
            previousMaxSpawnTime: previousTimer?.maxSpawnTime ?? null,
            windowOpenedAt: previousTimer?.windowOpenedAt ?? null,
          },
        })
        .catch((err) => {
          this.logger.error({
            level: "error",
            message: "Failed to enqueue event hero kill check",
            error: err instanceof Error ? err.message : err,
            guildId,
            world: data.world,
            npcId: data.npc.id,
          });
        });

      return newTimer;
    } catch (error) {
      if (error instanceof ExecutionError) {
        const existingTimer = await this.findTimerAfterLockFailure(
          guildId,
          data.world,
          data.npc.id,
        );
        if (existingTimer) {
          this.logger.log({
            level: "debug",
            message: "Lock contention resolved by returning existing timer",
            guildId,
            npcId: data.npc.id,
            world: data.world,
          });
          return existingTimer;
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
      await mainLock?.release();
      await dedupLock?.release();
    }
  }

  async createManualTimer(
    discordId: string,
    guildId: string,
    data: CreateManualTimerDto,
  ): Promise<Timer> {
    const now = new Date();

    let minSpawnTime: Date;
    let maxSpawnTime: Date;
    let latestRespBaseSeconds: number;
    let latestRespawnRandomness: number;

    if (data.customMinSpawnTime && data.customMaxSpawnTime) {
      minSpawnTime = data.customMinSpawnTime;
      maxSpawnTime = data.customMaxSpawnTime;

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

    const newTimer = await this.prisma.timer.create({
      data: {
        maxSpawnTime,
        minSpawnTime,
        npcId,
        world: data.world,
        latestRespBaseSeconds,
        latestRespawnRandomness,
        wasReset: false,
        npc: {
          id: npcId,
          name: data.name,
          prof: "",
          location: "",
          wt: "",
          lvl: 0,
          type: "",
          icon: "",
          margonemType: TIMER_TYPES.CUSTOM_MANUAL,
        },
        guild: { connect: { id: guildId } },
        member: { connect: { memberId: { userId: discordId, guildId } } },
      },
      include: { member: true },
    });

    await this.invalidateTimersCache(guildId);
    this.emitUpdateTimer(newTimer);
    return newTimer;
  }

  async getTimers(
    { world }: GetTimersDto,
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
  ) {
    const now = new Date();
    const administrativeUser = isAdministrativeUser(permissions);
    const cacheKey = this.getTimersCacheKey(guild.id, world);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log({ level: "debug", message: `Cache hit for ${cacheKey}` });
      const cachedTimers = JSON.parse(cached) as Timer[];
      return this.filterTimersByPermissions(
        cachedTimers,
        administrativeUser,
        roles,
      );
    }

    const timers = await this.prisma.timer.findMany({
      where: {
        guildId: guild.id,
        maxSpawnTime: { gt: now.toISOString() },
        world,
      },
      orderBy: { maxSpawnTime: "desc" },
      include: { member: true },
    });

    await this.redis.set(cacheKey, JSON.stringify(timers), CACHE_TTL_SECONDS);
    return this.filterTimersByPermissions(timers, administrativeUser, roles);
  }

  private filterTimersByPermissions(
    timers: Timer[],
    administrativeUser: boolean,
    roles: Role[],
  ): Timer[] {
    if (administrativeUser) return timers;
    return timers.filter((timer) => {
      const npc = parseNpc(timer.npc);
      return canViewNpcTimer(npc, roles);
    });
  }

  async getAllTimers(discordId: string, { world }: GetTimersDto) {
    const now = new Date();
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_TIMERS_READ],
    );

    if (guilds.length === 0) throw new ForbiddenException();

    const guildIds = guilds.map((guild) => guild.id);
    const [timers, permissionsPerGuild] = await Promise.all([
      this.prisma.timer.findMany({
        where: {
          guildId: { in: guildIds },
          maxSpawnTime: { gt: now.toISOString() },
          world,
        },
        orderBy: { maxSpawnTime: "desc" },
        include: { member: true },
      }),
      this.guildsService.getMultipleGuildsPermissions(discordId, guildIds),
    ]);

    const timersByGuild = timers.reduce<Record<string, Timer[]>>(
      (acc, timer) => {
        (acc[timer.guildId] ??= []).push(timer);
        return acc;
      },
      {},
    );

    return guilds.flatMap((guild) => {
      const guildPermissionsAndRoles = permissionsPerGuild.find(
        (p) => p.guild.id === guild.id,
      );

      const permissions = guildPermissionsAndRoles?.permissions ?? [];
      const roles = guildPermissionsAndRoles?.roles ?? [];
      const administrativeUser = isAdministrativeUser(permissions);
      const guildTimers = timersByGuild[guild.id] ?? [];

      return this.filterTimersByPermissions(
        guildTimers,
        administrativeUser,
        roles,
      );
    });
  }

  async resetTimer(
    discordId: string,
    guildId: string,
    npcId: string,
    data: ResetTimerDto,
  ) {
    const now = new Date();
    const npcIdNum = Number.parseInt(npcId, 10);
    const lockKey = this.getLockKey(data.world, npcIdNum, guildId);
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const timer = await this.prisma.timer.findUnique({
        where: { timerId: { guildId, world: data.world, npcId: npcIdNum } },
      });

      if (!timer) {
        throw new BadRequestException({ message: ErrorKey.TIMER_NOT_FOUND });
      }

      const { minSpawnTime, maxSpawnTime } = this.calculateRespawnTime(
        timer.latestRespBaseSeconds,
        timer.latestRespawnRandomness,
        now,
      );

      const updatedTimer = await this.prisma.timer.update({
        where: { timerId: { guildId, world: data.world, npcId: npcIdNum } },
        data: {
          minSpawnTime,
          maxSpawnTime,
          wasReset: true,
          member: { connect: { memberId: { userId: discordId, guildId } } },
        },
        include: { member: true },
      });

      await this.invalidateTimersCache(guildId);
      this.emitUpdateTimer(updatedTimer);
      return updatedTimer;
    } catch (error) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: "error",
          message: `Lock acquisition failed for resetTimer`,
          guildId,
          npcId: npcIdNum,
          world: data.world,
        });
        throw new ConflictException({ message: ErrorKey.TIMER_RACE_CONDITION });
      }
      throw error;
    } finally {
      await lock?.release();
    }
  }

  async deleteTimer(guildId: string, npcId: string, world: string) {
    const npcIdNum = Number.parseInt(npcId, 10);

    try {
      await this.prisma.timer.delete({
        where: { timerId: { guildId, world, npcId: npcIdNum } },
      });

      await this.invalidateTimersCache(guildId);
      this.emitDeleteTimer({ npcId: npcIdNum, world, guildId });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new BadRequestException({ message: ErrorKey.TIMER_NOT_FOUND });
      }
      throw error;
    }
  }

  async emitUpdateTimer(payload: Timer) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_UPDATE,
      payload,
    );
  }

  async emitDeleteTimer(payload: Partial<Timer>) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_DELETE,
      payload,
    );
  }

  async searchNpcsWithTimerData(
    guildId: string,
    world: string,
    search: string,
    limit = 10,
  ) {
    const limitNum = Number(limit) || 10;
    const manualTimerType = String(TIMER_TYPES.CUSTOM_MANUAL);
    const timers = await this.prisma.$queryRaw<Timer[]>`
      SELECT DISTINCT ON (t."npcId")
        t."npc",
        t."npcId",
        t."latestRespBaseSeconds",
        t."latestRespawnRandomness"
      FROM "Timer" t
      WHERE t."guildId" = ${guildId}
        AND t."world" = ${world}
        AND t."npc"->>'name' ILIKE ${"%" + search + "%"}
        AND COALESCE(t."npc"->>'margonemType', '0') != ${manualTimerType}
      ORDER BY t."npcId", t."updatedAt" DESC
      LIMIT ${limitNum}
    `;

    return timers
      .map((timer) => {
        const npc = parseNpc(timer.npc);
        if (!npc) return null;

        return {
          npcId: timer.npcId,
          name: (timer.npc as { name?: string })?.name || "",
          lvl: npc.lvl,
          type: npc.type,
          prof: (timer.npc as { prof?: string })?.prof || "",
          location: (timer.npc as { location?: string })?.location || "",
          wt: (timer.npc as { wt?: string | number })?.wt || 0,
          icon: (timer.npc as { icon?: string })?.icon || "",
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
