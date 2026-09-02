import { ForbiddenException } from "#src/shared/http/http-errors";
import type { CreateCommentDto } from "#src/loots/dto/create-comment-dto";
import { ErrorKey } from "../enum/error-key.enum.js";
import { LootsRepository } from "../loots.repository.js";

export class LootCommentService {
  constructor(private readonly repository: LootsRepository) {}

  async getComments(options: { guildId: string; lootId: number }) {
    const { guildId, lootId } = options;

    const comments = await this.repository.findComments(guildId, lootId);

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
    const result = await this.repository.createComment({
      discordId,
      guildId,
      lootId,
      content: body.content,
    });
    if (result.kind === "loot-missing") {
      throw new ForbiddenException(ErrorKey.CANT_CREATE_COMMENT);
    }
    if (result.kind !== "created") {
      throw new Error(`Loot comment creation failed: ${result.kind}`);
    }
    const comment = result.value;

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
