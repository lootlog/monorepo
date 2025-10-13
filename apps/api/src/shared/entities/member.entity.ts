import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MemberType } from 'generated/client';
import { RoleEntity } from './role.entity';

export class MemberEntity {
  @Exclude()
  id: number;

  @Expose()
  @ApiProperty({ example: 'discord_user_id_123', description: 'Discord user ID' })
  userId: string;

  @Expose()
  @ApiProperty({ example: 'guild_id_123', description: 'Guild ID' })
  guildId: string;

  @Expose()
  @ApiProperty({
    example: 'USER',
    enum: MemberType,
    description: 'Member type',
  })
  type: MemberType;

  @Expose()
  @ApiProperty({ example: 'PlayerName', description: 'Member display name' })
  name: string;

  @Expose()
  @ApiProperty({
    example: 'avatar_hash',
    description: 'Avatar hash',
    required: false,
  })
  avatar?: string;

  @Expose()
  @ApiProperty({
    example: 'banner_hash',
    description: 'Banner hash',
    required: false,
  })
  banner?: string;

  @Expose()
  @ApiProperty({ example: true, description: 'Whether member is active' })
  active: boolean;

  @Expose()
  @Type(() => RoleEntity)
  @ApiProperty({ type: [RoleEntity], description: 'Member roles' })
  roles?: RoleEntity[];

  @Exclude()
  globalUserId?: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
