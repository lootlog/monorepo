import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import type { CreateCommentDto } from "src/loots/dto/create-comment-dto";
import { ErrorKey } from "../enum/error-key.enum";

@Injectable()
export class LootCommentService {
  constructor(private readonly prisma: PrismaService) {}

  async getComments(options: { guildId: string; lootId: number }) {
    const { guildId, lootId } = options;

    const comments = await this.prisma.lootComment.findMany({
      where: {
        guildId,
        lootId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        member: {
          select: {
            name: true,
            avatar: true,
            userId: true,
            roles: {
              select: {
                color: true,
              },
              orderBy: {
                position: "desc",
              },
            },
          },
        },
      },
    });

    return comments;
  }

  async createComment(options: {
    discordId: string;
    guildId: string;
    lootId: number;
    body: CreateCommentDto;
  }) {
    const { discordId, lootId, body, guildId } = options;
    const loot = await this.prisma.loot.findFirst({
      where: {
        id: lootId,
        lootSubmissions: { some: { guildId } },
      },
    });

    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_CREATE_COMMENT);
    }

    const comment = await this.prisma.lootComment.create({
      data: {
        content: body.content,
        guildId,
        loot: {
          connect: {
            id: lootId,
          },
        },
        member: {
          connect: {
            memberId: {
              userId: discordId,
              guildId,
            },
          },
        },
      },
    });

    return comment;
  }
}
