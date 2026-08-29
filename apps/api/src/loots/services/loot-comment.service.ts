import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import type { CreateCommentDto } from "#src/loots/dto/create-comment-dto";
import { ErrorKey } from "../enum/error-key.enum.js";

@Injectable()
export class LootCommentService {
  constructor(private readonly prisma: PrismaService) {}

  async getComments(options: { guildId: string; lootId: number }) {
    const { guildId, lootId } = options;

    const comments = await this.prisma.lootComment.findMany({
      where: {
        organizationLootRecord: {
          guildId,
          lootId,
          archivedAt: null,
        },
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

    return comments.map((comment) => ({
      id: comment.id,
      lootId,
      guildId,
      content: comment.content,
      member: comment.member,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }

  async createComment(options: {
    discordId: string;
    guildId: string;
    lootId: number;
    body: CreateCommentDto;
  }) {
    const { discordId, lootId, body, guildId } = options;
    const organizationLootRecord =
      await this.prisma.organizationLootRecord.findFirst({
        where: {
          lootId,
          guildId,
          archivedAt: null,
        },
        select: { id: true },
      });

    if (!organizationLootRecord) {
      throw new ForbiddenException(ErrorKey.CANT_CREATE_COMMENT);
    }

    const comment = await this.prisma.lootComment.create({
      data: {
        content: body.content,
        organizationLootRecord: {
          connect: { id: organizationLootRecord.id },
        },
        member: {
          connect: {
            memberId: {
              userId: discordId,
              guildId: guildId,
            },
          },
        },
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

    return {
      id: comment.id,
      lootId,
      guildId,
      content: comment.content,
      member: comment.member,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
