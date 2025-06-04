import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  message: string;
}
