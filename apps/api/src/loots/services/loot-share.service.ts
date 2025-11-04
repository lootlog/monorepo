import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { PrismaService } from 'src/db/prisma.service';
import { ErrorKey } from 'src/loots/enum/error-key.enum';
import type { UpdateLootDto } from 'src/loots/dto/update-loot.dto';
import {
  LOOT_SHARE_ITEM_REGEX,
  LOOT_SHARE_MSG_REGEX,
} from 'src/loots/constants/loot-share-msg-regex';

interface ParsedPlayer {
  id: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  characterId: string;
  accountId: string;
}

interface ParsedLootItem {
  id: string;
  hid: string;
  name: string;
  icon: string;
  stat: string;
  pr: number;
  prc: number;
  lvl: number;
  rarity: string;
  prof: string[];
  type: string;
}

@Injectable()
export class LootShareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private parseJsonField(field: unknown): unknown {
    return typeof field === 'string' ? JSON.parse(field) : field;
  }

  getLootShareFromMsg(msg: string): Record<string, string[]> {
    const share: Record<string, string[]> = {};
    let match: RegExpExecArray | null;

    while ((match = LOOT_SHARE_MSG_REGEX.exec(msg)) !== null) {
      const nick = match[1].trim();
      const itemsStr = match[2];

      let itemMatch: RegExpExecArray | null;
      while ((itemMatch = LOOT_SHARE_ITEM_REGEX.exec(itemsStr)) !== null) {
        const itemId = itemMatch[1];
        if (share[nick]) {
          share[nick].push(itemId);
        } else {
          share[nick] = [itemId];
        }
      }
      LOOT_SHARE_ITEM_REGEX.lastIndex = 0;
    }

    return share;
  }

  async updateLootShare(
    discordId: string,
    lootId: number,
    data: UpdateLootDto,
  ): Promise<Record<string, string[]>> {
    const loot = await this.prisma.loot.findFirst({
      where: {
        id: lootId,
        lootSubmissions: { some: { member: { userId: discordId } } },
        lootShare: {
          equals: {},
        },
      },
    });

    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT);
    }

    const lootShare = this.getLootShareFromMsg(data.msg);
    if (Object.keys(lootShare).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE);
    }

    const parsedPlayers = this.parseJsonField(loot.players) as ParsedPlayer[];
    const parsedLoot = this.parseJsonField(loot.items) as ParsedLootItem[];

    const mappedLootShare = Object.entries(lootShare).reduce(
      (acc, [nick, hids]) => {
        const playerId = parsedPlayers.find((p) => p.name === nick)?.id;
        if (!playerId) return acc;

        const itemIds = (hids as string[])
          .map((hid) => parsedLoot.find((item) => item.hid === hid)?.hid)
          .filter(Boolean);

        if (itemIds.length === 0) return acc;

        acc[playerId] = itemIds;
        return acc;
      },
      {} as Record<string, string[]>,
    );

    if (Object.keys(mappedLootShare).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE_ITEM_OR_PLAYER);
    }

    if (Object.keys(mappedLootShare).length < parsedLoot.length) {
      this.logger.log({
        level: 'warn',
        message:
          'Loot share does not include all items, some items may not be shared',
        lootId,
        lootShareMsg: data.msg,
        mappedItemsCount: Object.keys(mappedLootShare).length,
        totalItemsCount: parsedLoot.length,
      });
    }

    await this.prisma.loot.update({
      where: { id: lootId },
      data: {
        lootShare: mappedLootShare,
      },
    });

    return mappedLootShare;
  }
}
