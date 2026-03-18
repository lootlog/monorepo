import { Exclude, Expose, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { MemberType } from "generated/client";
import { RoleEntity } from "./role.entity";

export class MemberEntity {
  @Expose()
  id: number;

  @Expose()
  @ApiProperty({
    example: "discord_user_id_123",
    description: "Discord user ID",
  })
  userId: string;

  @Expose()
  @ApiProperty({ example: "guild_id_123", description: "Guild ID" })
  guildId: string;

  @Expose()
  @ApiProperty({
    example: "USER",
    enum: MemberType,
    description: "Member type",
  })
  type: MemberType;

  @Expose()
  @ApiProperty({ example: "PlayerName", description: "Member display name" })
  name: string;

  @Expose()
  @ApiProperty({
    example: "avatar_hash",
    description: "Avatar hash",
    required: false,
  })
  avatar?: string;

  @Expose()
  @ApiProperty({
    example: "banner_hash",
    description: "Banner hash",
    required: false,
  })
  banner?: string;

  @Expose()
  @ApiProperty({ example: true, description: "Whether member is active" })
  active: boolean;

  @Expose()
  @Type(() => RoleEntity)
  @ApiProperty({ type: [RoleEntity], description: "Member roles" })
  roles?: RoleEntity[];

  @Expose()
  globalUserId?: string;

  @Expose()
  @ApiProperty({
    example: "2026-03-10T12:00:00.000Z",
    description: "When member data was last successfully synced from Discord",
    required: false,
  })
  lastDiscordSyncAt?: Date | null;

  @Expose()
  @ApiProperty({
    example: true,
    description: "Whether the returned member data is stale",
    required: false,
  })
  isStale?: boolean;

  @Expose()
  @ApiProperty({
    example: "Using cached data due to Discord API rate limiting or errors",
    description: "Additional context when stale member data is returned",
    required: false,
  })
  staleWarning?: string;

  @Expose()
  @ApiProperty({
    example: true,
    description: "Whether a background refresh has been queued",
    required: false,
  })
  refreshQueued?: boolean;

  @Expose()
  @ApiProperty({
    example: "2026-03-10T12:05:00.000Z",
    description: "Earliest time when the queued refresh can run",
    required: false,
  })
  nextRefreshAt?: Date | null;

  @Exclude()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
