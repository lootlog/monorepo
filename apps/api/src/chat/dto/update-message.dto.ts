import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  message: string;
}
