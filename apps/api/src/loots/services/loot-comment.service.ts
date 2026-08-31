import { and } from "@prisma/orm-family-sql/orm-client";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { attachRolesToMembers } from "#src/members/member-roles.repository";
import type { CreateCommentDto } from "#src/loots/dto/create-comment-dto";
import { ErrorKey } from "../enum/error-key.enum.js";

@Injectable()
export class LootCommentService {
  constructor(private readonly prisma: PrismaService) {}

  async getComments(options: { guildId: string; lootId: number }) {
    const { guildId, lootId } = options;

    const comments = await this.prisma.db.orm.public.LootComment.where((row) =>
      row.organizationLootRecord.some((related) =>
        and(
          related.guildId.eq(guildId),
          related.lootId.eq(lootId),
          related.archivedAt.isNull(),
        ),
      ),
    )
      .include("member", (relation) =>
        relation.select("id", "name", "avatar", "userId"),
      )
      .orderBy((row) => row.createdAt.desc())
      .all();
    const members = await attachRolesToMembers(
      this.prisma.db,
      comments.map((comment) => comment.member),
    );
    const membersById = new Map(members.map((member) => [member.id, member]));

    return comments.map((comment) => ({
      id: comment.id,
      lootId,
      guildId,
      content: comment.content,
      member: membersById.get(comment.member.id) ?? comment.member,
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
      await this.prisma.db.orm.public.OrganizationLootRecord.where((row) =>
        and(
          row.lootId.eq(lootId),
          row.guildId.eq(guildId),
          row.archivedAt.isNull(),
        ),
      )
        .select("id")
        .first();

    if (!organizationLootRecord) {
      throw new ForbiddenException(ErrorKey.CANT_CREATE_COMMENT);
    }

    const member = await this.prisma.db.orm.public.Member.where((row) =>
      and(row.userId.eq(discordId), row.guildId.eq(guildId)),
    ).first();
    if (!member) {
      throw new ForbiddenException(ErrorKey.CANT_CREATE_COMMENT);
    }
    const [memberWithRoles] = await attachRolesToMembers(this.prisma.db, [
      member,
    ]);
    const comment = await this.prisma.db.orm.public.LootComment.create({
      content: body.content,
      organizationLootRecordId: organizationLootRecord.id,
      memberId: member.id,
      updatedAt: new Date(),
    });

    return {
      id: comment.id,
      lootId,
      guildId,
      content: comment.content,
      member: memberWithRoles,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
