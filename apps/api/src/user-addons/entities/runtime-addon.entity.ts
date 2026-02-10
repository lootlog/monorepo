import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class RuntimeAddonEntity {
  @Expose()
  @ApiProperty({ example: 'online-players-glow-plus' })
  runtimeId: string;

  @Expose()
  @ApiProperty({ example: 'Online Players Glow Plus' })
  name: string;

  @Expose()
  @ApiPropertyOptional()
  description?: string | null;

  @Expose()
  @ApiProperty({ example: '0.1.0' })
  version: string;

  @Expose()
  @ApiProperty({ example: true })
  installed: boolean;

  @Expose()
  @ApiProperty({ description: 'CommonJS runtime code executed in game-client' })
  compiledCode: string;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Exclude()
  id: string;

  @Exclude()
  userId: string;

  @Exclude()
  sourceCode: string;

  @Exclude()
  language: string;

  @Exclude()
  createdAt: Date;
}
