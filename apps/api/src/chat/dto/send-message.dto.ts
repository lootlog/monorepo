import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Chat message content',
    example: 'Hello, guild!',
    minLength: 1,
    maxLength: 128,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  message: string;
  @IsBoolean()
  notification: boolean;
}
