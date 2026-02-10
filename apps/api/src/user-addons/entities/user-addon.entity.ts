import { AddonLanguage } from 'generated/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UserAddonEntity {
  @Expose()
  @ApiProperty({ example: 'ckv7s7zq50000e4s1a8q2x3y4' })
  id: string;

  @Exclude()
  userId: string;

  @Expose()
  @ApiProperty({ example: 'online-players-glow-plus' })
  runtimeId: string;

  @Expose()
  @ApiProperty({ example: 'Online Players Glow Plus' })
  name: string;

  @Expose()
  @ApiPropertyOptional({
    example: 'Highlights addon users and extends tooltip.',
  })
  description?: string | null;

  @Expose()
  @ApiProperty({ example: '0.1.0' })
  version: string;

  @Expose()
  @ApiProperty({ enum: AddonLanguage, enumName: 'AddonLanguage' })
  language: AddonLanguage;

  @Expose()
  @ApiProperty({ description: 'Original source code from editor' })
  sourceCode: string;

  @Exclude()
  compiledCode: string;

  @Expose()
  @ApiProperty({ example: true })
  installed: boolean;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;
}
