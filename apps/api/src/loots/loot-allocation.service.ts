import { db as prismaDb } from "#src/prisma/db";
import { and, or } from "@prisma/orm-family-sql/orm-client";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  getNpcTypeByWt,
  type GuildLootEventNpc,
  type GuildLootShareUpdatedEventV2,
} from "@lootlog/types";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { PrismaService } from "#src/db/prisma.service";
import { RoutingKey } from "#src/enum/routing-key.enum";
import {
  LOOT_SHARE_ITEM_REGEX,
  LOOT_SHARE_MSG_REGEX,
} from "#src/loots/constants/loot-share-msg-regex";
import type { CreateLootDto } from "#src/loots/dto/create-loot.dto";
import { ErrorKey } from "#src/loots/enum/error-key.enum";
import type { LootShare } from "#src/shared/dto/loot-response.dto";
import type { Logger } from "winston";
import { dateToTemporal } from "#src/db/temporal";

const LootShareSource = prismaDb.nativeEnums.public.LootShareSource.members;
type LootShareSource = (typeof LootShareSource)[keyof typeof LootShareSource];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];

type LootNpcWithSocketSnapshot = {
  npcSnapshot: {
    lvl: number | null;
    prof: string | null;
    _type: NpcType | null;
    wt: number | null;
  };
};

type InitialLootAllocation =
  | {
      share: Record<string, never>;
      source: typeof LootShareSource.NONE;
    }
  | {
      share: LootShare;
      source: typeof LootShareSource.ITEM_OWNER;
    };

const LOOT_SHARE_SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class LootAllocationService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async inferInitial(
    submission: CreateLootDto,
    primaryNpc: CreateLootDto["npcs"][number],
    primaryNpcType: NpcType,
  ): Promise<InitialLootAllocation> {
    if (primaryNpcType !== NpcType.COLOSSUS) {
      return { share: {}, source: LootShareSource.NONE };
    }

    const ambiguousNpcVariant =
      await this.prisma.db.orm.public.NpcSnapshot.where((row) =>
        and(
          row.name.eq(primaryNpc.name),
          or(row.type.neq(NpcType.COLOSSUS), row.type.isNull()),
        ),
      )
        .select("id")
        .first();
    if (ambiguousNpcVariant) {
      return { share: {}, source: LootShareSource.NONE };
    }

    const itemOwnerShare = this.mapItemOwnerAllocation(
      submission.loots,
      submission.players,
    );
    if (!itemOwnerShare) {
      return { share: {}, source: LootShareSource.NONE };
    }

    return {
      share: itemOwnerShare,
      source: LootShareSource.ITEM_OWNER,
    };
  }

  async confirmFromChat(options: {
    actorUserId: string;
    lootId: number;
    message: string;
  }): Promise<LootShare> {
    const submissionCutoff = new Date(
      Date.now() - LOOT_SHARE_SUBMISSION_WINDOW_MS,
    );
    const authorizedLoot = this.applyAuthorizedLootFilter(
      this.prisma.db.orm.public.Loot,
      options.actorUserId,
      options.lootId,
      submissionCutoff,
    );
    const loot = await authorizedLoot
      .include("lootItems", (relation) => relation.include("itemSnapshot"))
      .include("lootPlayers", (relation) => relation.include("playerSnapshot"))
      .include("lootNpcs", (relation) =>
        relation
          .include("npcSnapshot")
          .orderBy((relationRow) => relationRow.id.asc()),
      )
      .include("organizationLootRecords", (relation) =>
        relation.select("guildId").where((row) => row.archivedAt.isNull()),
      )
      .first();
    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT);
    }

    const parsedAllocation = this.parseChatAllocation(options.message);
    if (Object.keys(parsedAllocation).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE);
    }

    const players = loot.lootPlayers.map(({ lvl, playerSnapshot }) => ({
      id: `${playerSnapshot.characterId}${playerSnapshot.accountId}`,
      name: playerSnapshot.name,
      lvl: lvl ?? 0,
      prof: playerSnapshot.prof,
      icon: playerSnapshot.icon ?? "",
      characterId: String(playerSnapshot.characterId),
      accountId: String(playerSnapshot.accountId),
    }));
    const items = loot.lootItems.map(({ hid, itemSnapshot }) => ({
      id: String(itemSnapshot.itemId),
      hid,
      name: itemSnapshot.name,
      icon: itemSnapshot.icon,
      stat: itemSnapshot.statRaw,
      lvl: itemSnapshot.lvl ?? 0,
      rarity: itemSnapshot.rarity,
      prof: [],
      type: itemSnapshot.itemType ?? "",
    }));
    const mappedLootShare = this.resolveChatAllocation(
      parsedAllocation,
      players,
      items,
    );
    if (Object.keys(mappedLootShare).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE_ITEM_OR_PLAYER);
    }

    if (loot.lootShareSource === LootShareSource.CHAT_MESSAGE) {
      this.assertMatchingAllocation(
        options.lootId,
        loot.lootShare,
        mappedLootShare,
      );
      return {};
    }

    if (Object.keys(mappedLootShare).length < items.length) {
      this.logger.log({
        level: "warn",
        message:
          "Loot share does not include all items, some items may not be shared",
        lootId: options.lootId,
        mappedItemsCount: Object.keys(mappedLootShare).length,
        totalItemsCount: items.length,
      });
    }

    const updateResult = await authorizedLoot
      .where((row) => row.lootShareSource.neq(LootShareSource.CHAT_MESSAGE))
      .updateAndCount({
        lootShare: mappedLootShare,
        lootShareSource: LootShareSource.CHAT_MESSAGE,
        updatedAt: dateToTemporal(new Date()),
      });
    if (updateResult === 0) {
      return this.acknowledgeConcurrentUpdate({
        actorUserId: options.actorUserId,
        expectedLootShare: mappedLootShare,
        lootId: options.lootId,
        submissionCutoff,
      });
    }

    const socketNpcs = this.getSocketNpcPayloads(loot.lootNpcs);
    const organizationIds = this.getUniqueOrganizationIds(
      loot.organizationLootRecords,
    );
    await this.invalidateLootListCache(organizationIds);
    await Promise.all(
      organizationIds.map((organizationId) =>
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
          {
            version: 2,
            guildId: organizationId,
            lootId: options.lootId,
            lootShare: mappedLootShare,
            npcs: socketNpcs,
          } satisfies GuildLootShareUpdatedEventV2,
        ),
      ),
    );

    return {};
  }

  private mapItemOwnerAllocation(
    loots: CreateLootDto["loots"],
    players: CreateLootDto["players"],
  ): LootShare | null {
    if (loots.length === 0 || loots.length !== players.length) {
      return null;
    }

    const playerShareIdByCharacterId = new Map<number, string>();
    const shareIds = new Set<string>();
    for (const player of players) {
      const { accountId, characterId } = this.normalizeCharacterAndAccount(
        player.id,
        player.accountId,
      );
      const shareId = `${characterId}${accountId}`;
      if (playerShareIdByCharacterId.has(player.id) || shareIds.has(shareId)) {
        return null;
      }
      playerShareIdByCharacterId.set(player.id, shareId);
      shareIds.add(shareId);
    }

    const assignedCharacterIds = new Set<number>();
    const lootShare: LootShare = {};
    for (const loot of loots) {
      if (loot.own === undefined || assignedCharacterIds.has(loot.own)) {
        return null;
      }
      const shareId = playerShareIdByCharacterId.get(loot.own);
      if (shareId === undefined) {
        return null;
      }
      assignedCharacterIds.add(loot.own);
      lootShare[shareId] = [loot.hid];
    }

    return assignedCharacterIds.size === players.length ? lootShare : null;
  }

  private normalizeCharacterAndAccount(
    id: string | number,
    accountId: string | number,
  ): { characterId: number; accountId: number } {
    const account = String(accountId ?? "");
    const character = String(id ?? "");
    if (account && character.endsWith(account)) {
      const characterPart = character.slice(
        0,
        character.length - account.length,
      );
      return {
        characterId: Number(characterPart || character),
        accountId: Number(account),
      };
    }
    return { characterId: Number(character), accountId: Number(account) };
  }

  private parseChatAllocation(message: string): Record<string, string[]> {
    const allocation: Record<string, string[]> = {};
    let match: RegExpExecArray | null;

    while ((match = LOOT_SHARE_MSG_REGEX.exec(message)) !== null) {
      const nickname = match[1].trim();
      const items = match[2];
      let itemMatch: RegExpExecArray | null;

      while ((itemMatch = LOOT_SHARE_ITEM_REGEX.exec(items)) !== null) {
        const itemId = itemMatch[1];
        const allocatedItems = allocation[nickname];
        if (allocatedItems) {
          allocatedItems.push(itemId);
        } else {
          allocation[nickname] = [itemId];
        }
      }
      LOOT_SHARE_ITEM_REGEX.lastIndex = 0;
    }

    return allocation;
  }

  private resolveChatAllocation(
    parsedAllocation: Record<string, string[]>,
    players: Array<{ id: string; name: string }>,
    items: Array<{ hid: string }>,
  ): LootShare {
    const allocation: LootShare = {};

    for (const [nickname, hids] of Object.entries(parsedAllocation)) {
      const playerId = players.find((player) => player.name === nickname)?.id;
      if (!playerId) {
        continue;
      }

      const itemIds = hids
        .map((hid) => items.find((item) => item.hid === hid)?.hid)
        .filter((hid): hid is string => hid !== undefined);
      if (itemIds.length > 0) {
        allocation[playerId] = itemIds;
      }
    }

    return allocation;
  }

  private applyAuthorizedLootFilter(
    collection: any,
    actorUserId: string,
    lootId: number,
    submissionCutoff: Date,
  ) {
    return collection.where((loot) =>
      and(
        loot.id.eq(lootId),
        loot.organizationLootRecords.some((record) =>
          record.submissions.some((submission) =>
            and(
              submission.createdAt.gte(dateToTemporal(submissionCutoff)),
              submission.member.some((member) =>
                member.globalUserId.eq(actorUserId),
              ),
            ),
          ),
        ),
      ),
    );
  }

  private async acknowledgeConcurrentUpdate(options: {
    actorUserId: string;
    expectedLootShare: LootShare;
    lootId: number;
    submissionCutoff: Date;
  }): Promise<LootShare> {
    const loot = await this.applyAuthorizedLootFilter(
      this.prisma.db.orm.public.Loot,
      options.actorUserId,
      options.lootId,
      options.submissionCutoff,
    )
      .select("lootShare", "lootShareSource")
      .first();
    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT);
    }
    if (loot.lootShareSource !== LootShareSource.CHAT_MESSAGE) {
      throw new ServiceUnavailableException("Failed to persist loot share");
    }

    this.assertMatchingAllocation(
      options.lootId,
      loot.lootShare,
      options.expectedLootShare,
    );
    return {};
  }

  private assertMatchingAllocation(
    lootId: number,
    persistedLootShare: unknown,
    submittedLootShare: LootShare,
  ): void {
    const persisted = this.stableSerialize(persistedLootShare);
    const submitted = this.stableSerialize(submittedLootShare);
    if (persisted === submitted) {
      return;
    }

    this.logger.warn("Conflicting chat loot share rejected", {
      lootId,
      persistedHash: createHash("sha256").update(persisted).digest("hex"),
      submittedHash: createHash("sha256").update(submitted).digest("hex"),
    });
    throw new ConflictException("Conflicting loot share");
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }
    return JSON.stringify(value) ?? "undefined";
  }

  private getSocketNpcPayloads(
    lootNpcs: LootNpcWithSocketSnapshot[],
  ): GuildLootEventNpc[] {
    return lootNpcs.map(({ npcSnapshot }) => ({
      lvl: npcSnapshot.lvl,
      prof: npcSnapshot.prof,
      type:
        npcSnapshot._type ??
        getNpcTypeByWt(
          NpcType,
          npcSnapshot.wt ?? 0,
          npcSnapshot.prof ?? undefined,
        ),
      wt: npcSnapshot.wt,
    }));
  }

  private getUniqueOrganizationIds(
    records: Array<{ guildId: string }>,
  ): string[] {
    return [...new Set(records.map((record) => record.guildId))];
  }

  private async invalidateLootListCache(
    organizationIds: string[],
  ): Promise<void> {
    await Promise.all(
      organizationIds.map(async (organizationId) => {
        try {
          await this.redisService.deleteByPattern(
            `loots:list:${organizationId}:*`,
          );
        } catch (error) {
          this.logger.warn("Failed to invalidate loots list cache", {
            error,
            guildId: organizationId,
          });
        }
      }),
    );
  }
}
