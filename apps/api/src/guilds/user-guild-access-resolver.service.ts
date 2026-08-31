import type { FieldOutputTypes } from "../prisma/contract.js";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { APIGuild } from "discord-api-types/v10";
import { isDiscordAdministrator } from "@lootlog/nest-shared";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DiscordService } from "#src/discord/discord.service";
import { PrismaService } from "#src/db/prisma.service";
import { temporalToDate } from "#src/db/temporal";
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/constants/member-discord-status.constant";
import { MembersService } from "#src/members/members.service";

type Guild = FieldOutputTypes["public"]["Guild"];

export interface GuildRefreshCandidate {
  guild: Guild;
  isDiscordOwner: boolean;
  hasDiscordAdmin: boolean;
}

@Injectable()
export class UserGuildAccessResolver {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly membersService: MembersService,
  ) {}

  getCandidateGuildsForUser(
    discordId: string,
    userId: string,
  ): Promise<GuildRefreshCandidate[]> {
    return this.getDiscordLootlogGuildCandidates(discordId, userId);
  }

  isDiscordGuildListFallbackError(error: unknown): boolean {
    if (!(error instanceof HttpException)) {
      return false;
    }

    const status = error.getStatus();
    return (
      status === HttpStatus.TOO_MANY_REQUESTS ||
      status === HttpStatus.REQUEST_TIMEOUT ||
      status >= HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  private async getDiscordLootlogGuildCandidates(
    discordId: string,
    userId: string,
  ): Promise<GuildRefreshCandidate[]> {
    const { guilds: discordGuilds } =
      await this.discordService.getFreshCompleteUserGuilds(userId, discordId);
    const discordGuildIds = discordGuilds.map((guild) => guild.id);

    await this.membersService.deactivateMembersMissingFromDiscordGuilds({
      discordId,
      userId,
      activeDiscordGuildIds: discordGuildIds,
      status: MEMBER_LAST_DISCORD_STATUS.GUILD_NOT_IN_DISCORD_LIST,
    });

    if (discordGuilds.length === 0) {
      this.logger.log({
        level: "warn",
        message: `No guilds found for user ${userId} with Discord ID ${discordId}`,
      });
      return [];
    }

    const discordGuildMap = new Map(
      discordGuilds.map((guild) => [guild.id, guild] as const),
    );
    const guilds = await this.prisma.db.orm.public.Guild.where((row) =>
      row.active.eq(true),
    )
      .where((guild) => guild.id.in(discordGuildIds))
      .all();

    return guilds.map((guild) => {
      const discordGuild = discordGuildMap.get(guild.id);

      return {
        guild: {
          ...guild,
          createdAt: temporalToDate(guild.createdAt),
          updatedAt: temporalToDate(guild.updatedAt),
        },
        isDiscordOwner: discordGuild
          ? this.isDiscordOwnerGuild(discordGuild, discordId)
          : false,
        hasDiscordAdmin: discordGuild
          ? this.hasDiscordAdministratorAccess(discordGuild)
          : false,
      };
    });
  }

  private isDiscordOwnerGuild(
    discordGuild: APIGuild,
    discordId: string,
  ): boolean {
    const guild = discordGuild as APIGuild & {
      owner?: boolean;
      owner_id?: string;
    };

    return Boolean(guild.owner || guild.owner_id === discordId);
  }

  private hasDiscordAdministratorAccess(discordGuild: APIGuild): boolean {
    try {
      return isDiscordAdministrator(BigInt(discordGuild.permissions));
    } catch {
      return false;
    }
  }
}
